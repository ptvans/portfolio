import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import './CaseStudy.css';
import ImageLightbox from '../components/ImageLightbox';
import { caseStudies } from '../data/caseStudies';

function CaseStudy({ theme, toggleTheme }) {
  const { slug } = useParams();
  const caseStudy = caseStudies[slug];
  const [activeSection, setActiveSection] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('.content-section');
      let current = '';

      sections.forEach((section) => {
        const sectionTop = section.offsetTop;
        if (window.pageYOffset >= sectionTop - 200) {
          current = section.getAttribute('id');
        }
      });

      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 100;
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth',
      });
    }
  };

  if (!caseStudy) {
    return <div>Case study not found</div>;
  }

  return (
    <div className="case-study">
      <nav className="case-study-nav">
        <Link to="/" className="back-button">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="20" fill="currentColor" opacity="0.1"/>
            <circle cx="20" cy="16" r="6" fill="currentColor" opacity="0.6"/>
            <path d="M8 32c0-6.627 5.373-12 12-12s12 5.373 12 12" fill="currentColor" opacity="0.6"/>
          </svg>
        </Link>

        <div className="nav-sections">
          {caseStudy.sections.map((section) => (
            <button
              key={section.id}
              className={`nav-link ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => scrollToSection(section.id)}
            >
              {section.title}
            </button>
          ))}
        </div>
      </nav>

      <main className="case-study-content">
        <header className="case-study-header">
          <h1>{caseStudy.title}</h1>
          <p className="subtitle">{caseStudy.subtitle}</p>
        </header>

        {caseStudy.sections.map((section) => (
          <section key={section.id} id={section.id} className="content-section">
            {section.content.map((block, index) => {
              if (block.type === 'text') {
                // Handle text with inline links
                if (block.parts) {
                  return (
                    <p key={index} className="content-text">
                      {block.parts.map((part, partIndex) => {
                        if (typeof part === 'string') {
                          return part;
                        } else if (part.type === 'link') {
                          return (
                            <a
                              key={partIndex}
                              href={part.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-link"
                            >
                              {part.text}
                            </a>
                          );
                        }
                        return null;
                      })}
                    </p>
                  );
                }
                return <p key={index} className="content-text">{block.value}</p>;
              } else if (block.type === 'heading') {
                return <h2 key={index} className="content-heading">{block.value}</h2>;
              } else if (block.type === 'list') {
                return (
                  <ol key={index} className="content-list">
                    {block.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ol>
                );
              } else if (block.type === 'image') {
                return (
                  <figure key={index} className="content-image">
                    <div 
                      className="image-wrapper"
                      onClick={() => setLightboxImage(block)}
                    >
                      <img src={block.src} alt={block.alt} />
                    </div>
                    {block.caption && (
                      <figcaption>{block.caption}</figcaption>
                    )}
                  </figure>
                );
              }
              return null;
            })}
          </section>
        ))}
      </main>

      {lightboxImage && (
        <ImageLightbox
          image={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
}

export default CaseStudy;

