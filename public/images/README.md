# Images Directory

## Structure

- `/case-studies/on-call/` - Images for the on-call software case study
- `/case-studies/status-pages/` - Images for the status pages case study

## Adding Images

1. Place your images in the appropriate case study folder
2. Update the image references in `/src/data/caseStudies.js`

## Recommended Image Formats

- Use `.jpg` for photographs
- Use `.png` for screenshots with transparency
- Use `.webp` for best performance
- Optimize images before adding (recommended max width: 1600px)

## Example Usage in caseStudies.js

```javascript
{
  type: 'image',
  src: '/images/case-studies/on-call/mobile-screens.png',
  alt: 'Mobile app interface',
  caption: 'Sample screens from the on-call app'
}
```

