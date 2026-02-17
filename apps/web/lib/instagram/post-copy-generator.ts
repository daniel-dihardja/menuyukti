export type OfferType = "combo_offer" | "happy_hour" | "hero_item";
export type Daypart = "morning" | "lunch" | "afternoon" | "evening";

export type PostCopyInput = {
  menuItem: string;
  daypart: Daypart;
  offerType: OfferType;
  currencyCode?: string | null;
};

export type PostCopyOutput = {
  captionVariants: [string, string];
  cta: string;
  hashtags: string[];
};

function normalizeMenu(menuItem: string): string {
  return menuItem.trim().replace(/\s+/g, " ");
}

function offerLabel(offerType: OfferType): string {
  if (offerType === "combo_offer") return "combo offer";
  if (offerType === "happy_hour") return "happy hour";
  return "hero item spotlight";
}

function daypartPrompt(daypart: Daypart): string {
  if (daypart === "morning") return "start your day";
  if (daypart === "lunch") return "lunch break";
  if (daypart === "afternoon") return "afternoon recharge";
  return "dinner plans";
}

function ctaByOffer(offerType: OfferType): string {
  if (offerType === "combo_offer") return "Order now and tag your combo buddy.";
  if (offerType === "happy_hour") return "Visit us today before happy hour ends.";
  return "Try it today and tell us your favorite bite.";
}

function hashtags(offerType: OfferType, daypart: Daypart): string[] {
  const offerTag = offerType === "combo_offer" ? "#ComboDeal" : offerType === "happy_hour" ? "#HappyHour" : "#ChefPick";
  const daypartTag = daypart === "morning" ? "#Breakfast" : daypart === "lunch" ? "#Lunch" : daypart === "afternoon" ? "#AfternoonSnack" : "#Dinner";
  return [offerTag, daypartTag, "#MenuYukti", "#RestaurantMarketing"];
}

export function generateDeterministicPostCopy(input: PostCopyInput): PostCopyOutput {
  const menu = normalizeMenu(input.menuItem) || "Today\'s special";
  const offer = offerLabel(input.offerType);
  const daypartHint = daypartPrompt(input.daypart);

  return {
    captionVariants: [
      `${menu} is our ${daypartHint} recommendation. Ask for the ${offer} while it lasts.`,
      `Craving ${menu}? Make this your ${daypartHint} stop with our ${offer} this week.`,
    ],
    cta: ctaByOffer(input.offerType),
    hashtags: hashtags(input.offerType, input.daypart),
  };
}
