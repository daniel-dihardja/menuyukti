# react-chrono Theme Properties

All 36 theme properties. Pass as `theme={{ ... }}` on `<Chrono>`.

## Base Colors
| Property | Description | Example |
|---|---|---|
| `primary` | Main accent (dots, active states) | `'#0079e6'` |
| `secondary` | Secondary accent | `'#666666'` |
| `textColor` | Default text | `'#333333'` |

## Card Colors
| Property | Description |
|---|---|
| `cardBgColor` | Card background |
| `cardDetailsBackGround` | Card details section background |
| `cardDetailsColor` | Card details text |
| `cardMediaBgColor` | Media section background |
| `cardSubtitleColor` | Subtitle text |
| `cardTitleColor` | Card title text |
| `detailsColor` | Detailed content text |

## Timeline Colors
| Property | Description |
|---|---|
| `titleColor` | Point label (inactive) |
| `titleColorActive` | Point label (active) |
| `timelineBgColor` | Timeline background |
| `iconBackgroundColor` | Icon background |

## Toolbar Colors
| Property | Description |
|---|---|
| `toolbarBgColor` | Toolbar background |
| `toolbarBtnBgColor` | Toolbar button background |
| `toolbarTextColor` | Toolbar text/icon color |

## Nested Timeline Colors
| Property | Description |
|---|---|
| `nestedCardBgColor` | Nested card background |
| `nestedCardDetailsBackGround` | Nested card details background |
| `nestedCardDetailsColor` | Nested card details text |
| `nestedCardSubtitleColor` | Nested subtitle |
| `nestedCardTitleColor` | Nested title |

## Dark Mode Enhanced Colors
| Property | Description |
|---|---|
| `iconColor` | Icon color in dark mode |
| `buttonHoverBgColor` | Button background on hover |
| `buttonActiveBgColor` | Button background when active |
| `buttonActiveIconColor` | Icon color on active button |
| `buttonBorderColor` | Button border |
| `buttonHoverBorderColor` | Button border on hover |
| `buttonActiveBorderColor` | Button border when active |
| `shadowColor` | Shadow/depth color |
| `glowColor` | Glow/focus color |
| `searchHighlightColor` | Search match highlight |

## Dark Toggle Colors
| Property | Description |
|---|---|
| `darkToggleActiveBgColor` | Toggle background when dark mode on |
| `darkToggleActiveIconColor` | Toggle icon when dark mode on |
| `darkToggleActiveBorderColor` | Toggle border when dark mode on |
| `darkToggleGlowColor` | Toggle glow when dark mode on |

## Light Theme Example
```js
theme={{
  primary: '#0079e6',
  secondary: '#888888',
  cardBgColor: '#ffffff',
  cardTitleColor: '#1f2937',
  cardSubtitleColor: '#6b7280',
  titleColor: '#374151',
  titleColorActive: '#0079e6',
  timelineBgColor: '#f9fafb',
  toolbarBgColor: '#ffffff',
}}
```

## Dark Theme Example
```js
theme={{
  primary: '#3b82f6',
  cardBgColor: '#1f2937',
  cardTitleColor: '#f9fafb',
  cardSubtitleColor: '#9ca3af',
  cardDetailsColor: '#d1d5db',
  titleColor: '#9ca3af',
  titleColorActive: '#60a5fa',
  timelineBgColor: '#111827',
  toolbarBgColor: '#1f2937',
  toolbarTextColor: '#f9fafb',
}}
```