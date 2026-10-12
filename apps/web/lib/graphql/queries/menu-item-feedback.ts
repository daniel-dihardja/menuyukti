/**
 * GraphQL documents for menu item feedback (guest submit + owner moderation).
 */

export type MenuItemFeedbackSentiment = 'POSITIVE' | 'NEGATIVE'
export type MenuItemFeedbackStatus = 'PENDING' | 'PUBLISHED' | 'HIDDEN'

export type PublicMenuItemFeedback = {
  sentiment: MenuItemFeedbackSentiment | null
  body: string
  guestDisplayName: string | null
  ownerReply: string | null
  createdAt: string
}

export type MenuItemFeedbackRow = {
  id: number
  locationId: number
  menuItemId: number
  menuItemName: string
  posOrderId: number | null
  clerkUserId: string
  sentiment: MenuItemFeedbackSentiment | null
  body: string
  guestDisplayName: string | null
  ownerReply: string | null
  ownerRepliedAt: string | null
  status: MenuItemFeedbackStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export const SUBMIT_MENU_ITEM_FEEDBACK_MUTATION = `
  mutation SubmitMenuItemFeedback(
    $locationId: Int!
    $menuItemId: Int!
    $body: String!
    $sentiment: MenuItemFeedbackSentiment
    $guestDisplayName: String
    $posOrderId: Int
  ) {
    submitMenuItemFeedback(
      locationId: $locationId
      menuItemId: $menuItemId
      body: $body
      sentiment: $sentiment
      guestDisplayName: $guestDisplayName
      posOrderId: $posOrderId
    ) {
      id
      status
      menuItemId
      posOrderId
      sentiment
      body
    }
  }
`

export type SubmitMenuItemFeedbackData = {
  submitMenuItemFeedback: {
    id: number
    status: MenuItemFeedbackStatus
    menuItemId: number
    posOrderId: number | null
    sentiment: MenuItemFeedbackSentiment | null
    body: string
  }
}

export const LOCATION_MENU_ITEM_FEEDBACKS_QUERY = `
  query LocationMenuItemFeedbacks($locationId: Int!, $status: MenuItemFeedbackStatus) {
    locationMenuItemFeedbacks(locationId: $locationId, status: $status) {
      id
      locationId
      menuItemId
      menuItemName
      posOrderId
      clerkUserId
      sentiment
      body
      guestDisplayName
      ownerReply
      ownerRepliedAt
      status
      publishedAt
      createdAt
      updatedAt
    }
    locationMenuItemFeedbackPendingCount(locationId: $locationId)
  }
`

export type LocationMenuItemFeedbacksData = {
  locationMenuItemFeedbacks: MenuItemFeedbackRow[]
  locationMenuItemFeedbackPendingCount: number
}

export const REPLY_MENU_ITEM_FEEDBACK_MUTATION = `
  mutation ReplyMenuItemFeedback($feedbackId: Int!, $reply: String!) {
    replyMenuItemFeedback(feedbackId: $feedbackId, reply: $reply) {
      id
      ownerReply
      ownerRepliedAt
      status
    }
  }
`

export type ReplyMenuItemFeedbackData = {
  replyMenuItemFeedback: {
    id: number
    ownerReply: string | null
    ownerRepliedAt: string | null
    status: MenuItemFeedbackStatus
  }
}

export const PUBLISH_MENU_ITEM_FEEDBACK_MUTATION = `
  mutation PublishMenuItemFeedback($feedbackId: Int!) {
    publishMenuItemFeedback(feedbackId: $feedbackId) {
      id
      status
      publishedAt
    }
  }
`

export type PublishMenuItemFeedbackData = {
  publishMenuItemFeedback: {
    id: number
    status: MenuItemFeedbackStatus
    publishedAt: string | null
  }
}

export const HIDE_MENU_ITEM_FEEDBACK_MUTATION = `
  mutation HideMenuItemFeedback($feedbackId: Int!) {
    hideMenuItemFeedback(feedbackId: $feedbackId) {
      id
      status
    }
  }
`

export type HideMenuItemFeedbackData = {
  hideMenuItemFeedback: {
    id: number
    status: MenuItemFeedbackStatus
  }
}
