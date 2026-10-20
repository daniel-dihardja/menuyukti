/** Pickup offer service GraphQL documents. */

export type PickupOffer = {
  id: number
  locationId: number
  locationName: string
  title: string
  description: string
  status: string
  availableFrom: string
  availableUntil: string
  price: number | null
  createdAt: string
  isLive: boolean
}

const PICKUP_OFFER_FIELDS = `
  id
  locationId
  locationName
  title
  description
  status
  availableFrom
  availableUntil
  price
  createdAt
  isLive
`

export const PICKUP_OFFERS_QUERY = `
  query PickupOffers($locationId: Int!) {
    pickupOffers(locationId: $locationId) {
      ${PICKUP_OFFER_FIELDS}
    }
  }
`

export type PickupOffersData = {
  pickupOffers: PickupOffer[]
}

export const CREATE_PICKUP_OFFER_MUTATION = `
  mutation CreatePickupOffer($input: CreatePickupOfferInput!) {
    createPickupOffer(input: $input) {
      ${PICKUP_OFFER_FIELDS}
    }
  }
`

export type CreatePickupOfferData = {
  createPickupOffer: PickupOffer
}

export const CLOSE_PICKUP_OFFER_MUTATION = `
  mutation ClosePickupOffer($offerId: Int!) {
    closePickupOffer(offerId: $offerId) {
      ${PICKUP_OFFER_FIELDS}
    }
  }
`

export type ClosePickupOfferData = {
  closePickupOffer: PickupOffer
}

export const PUBLIC_LOCATION_PICKUP_OFFER_QUERY = `
  query PublicLocationPickupOffer($slug: String!) {
    publicLocationPickupOffer(slug: $slug) {
      ${PICKUP_OFFER_FIELDS}
    }
  }
`

export type PublicLocationPickupOfferData = {
  publicLocationPickupOffer: PickupOffer | null
}
