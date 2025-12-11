# Portfolio Website

A minimalist product design portfolio website built with React, featuring case studies with expandable images and light/dark theme support.

## Features

- **Home Page**: Simple text-based introduction with links to case studies
- **Case Study Pages**: Article-style layout with left navigation
- **Image Lightbox**: Click any image to view in full-screen overlay
- **Theme Toggle**: Switch between light and dark modes (preference saved to localStorage)
- **Responsive Design**: Works beautifully on desktop and mobile
- **GitHub Pages Deployment**: Automatic deployment via GitHub Actions

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm start
```

The site will open at [http://localhost:3000](http://localhost:3000).

### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` folder.

## Deployment to GitHub Pages

This project is configured to automatically deploy to GitHub Pages when you push to the `main` branch.

### Setup Instructions

1. **Enable GitHub Pages in your repository:**
   - Go to your repository Settings
   - Navigate to "Pages" in the sidebar
   - Under "Build and deployment", set Source to "GitHub Actions"

2. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

3. The GitHub Action will automatically build and deploy your site.

4. **If using a subdirectory** (e.g., `username.github.io/portfolio`):
   - Update the `homepage` field in `package.json` to:
     ```json
     "homepage": "https://YOUR_USERNAME.github.io/YOUR_REPO"
     ```

5. **If using a custom domain**:
   - Update the `homepage` field in `package.json` to your domain
   - Add a `CNAME` file to the `public/` folder with your domain

## Customizing Content

### Home Page

Edit `/src/pages/Home.js` to update:
- Your name and title
- About section text
- Case study links
- Social media links

### Case Studies

Edit `/src/data/caseStudies.js` to add or modify case studies. Each case study has:
- `title`: Main heading
- `subtitle`: Subheading (usually company name)
- `sections`: Array of sections, each with:
  - `id`: Used for navigation
  - `title`: Section name in navigation
  - `content`: Array of content blocks (text, headings, images)

### Images

Replace the placeholder images with your own:
1. Add images to `/public/images/`
2. Update the image `src` in `caseStudies.js`:
   ```javascript
   {
     type: 'image',
     src: '/images/your-image.png',
     alt: 'Image description',
     caption: 'Optional caption'
   }
   ```

### Styling

- Global styles: `/src/App.css`
- Home page styles: `/src/pages/Home.css`
- Case study styles: `/src/pages/CaseStudy.css`
- Colors are automatically adapted for light/dark themes

## Project Structure

```
portfolio/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── ImageLightbox.js      # Full-screen image viewer
│   │   └── ImageLightbox.css
│   ├── data/
│   │   └── caseStudies.js        # Case study content
│   ├── pages/
│   │   ├── Home.js               # Home page component
│   │   ├── Home.css
│   │   ├── CaseStudy.js          # Case study page component
│   │   └── CaseStudy.css
│   ├── App.js                    # Main app with routing
│   ├── App.css                   # Global styles
│   └── index.js                  # Entry point
├── .github/
│   └── workflows/
│       └── deploy.yml            # GitHub Actions workflow
└── package.json
```

## Technologies Used

- **React** - UI framework
- **React Router** - Client-side routing
- **Create React App** - Build tooling
- **GitHub Actions** - CI/CD
- **GitHub Pages** - Hosting

## License

See LICENSE file for details.
