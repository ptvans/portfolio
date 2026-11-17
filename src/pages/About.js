import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import './About.css';

const SKILLS = [
  'Product Design',
  'User Research',
  'Automated / AI + ML workflows',
  'Developer Tools',
  'Data Visualization',
  'Product Management & Strategy',
];

const CLIENTS = [
  {
    name: 'Replit',
    work: 'Build coding Agents that write and deploy apps based on your natural language requests',
  },
  {
    name: 'Facebook',
    work: 'Building out engineering infrastructure (code review, deployment, testing, performance analysis) and other employee productivity tools',
  },
  {
    name: 'Apple',
    work: 'Iterating 3D visualization & ML training tools for autonomous systems',
  },
  {
    name: 'Uber Freight',
    work: 'Building market monitoring, pricing, and contract management tools',
  },
  {
    name: 'Atlassian',
    work: 'Building automation-as-a-service and internal people-management tools',
  },
  {
    name: 'Desktop Metal',
    work: 'Bringing easy-to-use 3D printing workflows for medical implants to clinicians',
  },
  {
    name: 'Stanford',
    work: "Producing data analysis and visualization to understand California's drought and water usage",
  },
  {
    name: 'Ridgeline',
    work: 'Building new cloud-based infrastructure for the investment management industry',
  },
];

function About({ theme, toggleTheme }) {
  // HashRouter keeps the scroll position from the home page; start at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="home about-page">
      <div className="home-container">
        <Link to="/" className="about-back" aria-label="Back to home">
          <img src="./images/paul-blue-avatar-pfp.jpg" alt="" className="avatar-image" />
        </Link>

        <header className="about-header">
          <h1>About</h1>
          <p className="about-lede">
            15 years of helping startups rapidly prototype products and helping large companies build
            internal systems.
          </p>
        </header>

        <section className="about-block">
          <h2>Skills</h2>
          <ul className="about-skills">
            {SKILLS.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        </section>

        <section className="about-block">
          <h2>Specialties</h2>
          <p>
            Specializing in B2B/SaaS across many industry verticals, including employee tools, enterprise
            software, workflows, automation, autonomous systems, machine learning, data visualization, app
            performance, and engineering, analytics &amp; development tooling.
          </p>
        </section>

        <section className="about-block">
          <h2>Past Clients / Employers</h2>
          <dl className="about-clients">
            {CLIENTS.map((c) => (
              <div key={c.name} className="about-client">
                <dt>{c.name}</dt>
                <dd>{c.work}</dd>
              </div>
            ))}
          </dl>
        </section>

        <footer className="home-footer">
          <div className="footer-brand">
            <img src="./images/th-logo.png" alt="Thom" className="footer-logo" />
            <p>© 2026</p>
          </div>
          <div className="theme-toggle">
            <button className={theme === 'light' ? '' : 'inactive'} onClick={toggleTheme}>
              Light
            </button>
            <button className={theme === 'dark' ? '' : 'inactive'} onClick={toggleTheme}>
              Dark
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default About;
