import type { Offer } from '../components/OfferCard'

export type Reward = {
  id: string
  title: string
  description: string
  pointsCost: number
}

export type MockRestaurant = {
  displayName: string
  greeting: string
  featuredOffer: Offer
  offers: Offer[]
  points: number
  stampCard: { title: string; collected: number; total: number }
  rewards: Reward[]
}

/** Demo content for the consumer marketing shell. */
export const mockRestaurant: MockRestaurant = {
  displayName: 'Harbor Kitchen',
  greeting: 'Good to see you',
  featuredOffer: {
    id: 'featured-1',
    title: 'Weekday lunch, on us',
    description:
      'Get a free side with any main between 11:30 and 14:00. Show this offer at the counter.',
    badge: 'Featured',
    featured: true,
  },
  offers: [
    {
      id: 'offer-2',
      title: 'Happy hour drinks',
      description: '20% off soft drinks and house coffee, Mon–Thu 16:00–18:00.',
      badge: 'Limited',
    },
    {
      id: 'offer-3',
      title: 'Bring a friend',
      description: 'Share dessert when you dine with a guest — valid this weekend.',
      badge: 'Weekend',
    },
    {
      id: 'offer-4',
      title: 'Early bird breakfast',
      description: 'Coffee upgrade free with any breakfast plate before 9:00.',
    },
  ],
  points: 240,
  stampCard: {
    title: 'Coffee club',
    collected: 6,
    total: 10,
  },
  rewards: [
    {
      id: 'reward-1',
      title: 'Free espresso',
      description: 'Any single espresso drink.',
      pointsCost: 100,
    },
    {
      id: 'reward-2',
      title: 'Dessert on the house',
      description: 'Choose from the daily dessert board.',
      pointsCost: 200,
    },
    {
      id: 'reward-3',
      title: 'Two-course lunch',
      description: 'Starter + main from the lunch menu.',
      pointsCost: 450,
    },
  ],
}
