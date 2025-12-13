export const caseStudies = {
  'ai-coding-agents': {
    title: 'Make Coding Agents Easy to Use',
    subtitle: 'Replit.com',
    sections: [
      {
        id: 'context',
        title: 'Context',
        content: [
          {
            type: 'heading',
            value: 'Context'
          },
          {
            type: 'text',
            value: 'Transitioning from a chat-assisted IDE to an AI-driven app building experience...',
            italic: true
          },
          {
            type: 'text',
            value: 'With the advent of LLM coding models, Replit wanted to open up their product to anyone with a computer or phone, beyond the audience of professional developers.'
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/on-call/slide01.png`,
            alt: 'From IDE to prompt driven experience',
            caption: 'From IDE to prompt driven experience'
          }
        ]
      },
      {
        id: 'problem',
        title: 'Problem',
        content: [
          {
            type: 'heading',
            value: 'Problem'
          },
          {
            type: 'text',
            value: 'When first introducing prompt-based coding, we noticed that the majority of users abandoned the project creation flow before achieving a barebones MVP app that worked.'
          },
          {
            type: 'text',
            value: 'Why were they abandoning the flow? '
          },
          {
            type: 'text',
            value: 'Most people are missing a few key pieces of knowledge that is needed to create products:'
          },
          {
            type: 'list',
            items: [
              'They don\'t know the steps involved in the product development lifecycle',
              'They don\'t know what these coding agents are capable of doing',
              'They don\'t know how to accurately define an MVP app for said coding agent to work on'
            ]
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/on-call/slide02.png`,
            alt: 'Agent-guided app development plan',
            caption: 'Agent-guided app development plan'
          }
        ]
      },
      {
        id: 'approach',
        title: 'Approach & Collaboration',
        content: [
          {
            type: 'heading',
            value: 'Approach & Collaboration'
          },
          {
            type: 'text',
            value: 'Working with the AI team, we developed three agents with their needed respective tools.'
          },
          {
            type: 'text',
            value: 'The Planner Agent would help a user define the app they wanted to build. The Product Manager Agent would then monitor plan progress, dole out tasks to the Coding Agent, and check with the user to confirm that features were working as intended. The Coding Agent generated code and set up dependencies and integrations.'
          },
          {
            type: 'text',
            value: 'All of these agentic behaviors must progress in a way that makes sense to the user, and is constrained in the number of tokens spent for each step.'
          }
        ]
      },
      {
        id: 'solution',
        title: 'Solution',
        content: [
          {
            type: 'heading',
            value: 'Solution'
          },
          {
            type: 'text',
            value: 'Our goal was to get the user to a working version of their requested app as quickly as possible — in a single shot agent build.'
          },
          {
            type: 'text',
            value: 'The solution consisted of a simplified project creation flow that allows user to start with a simple text prompt and iteratively add features and technical requirements with help from the Planner Agent.'
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/on-call/slide04.png`,
            alt: 'Reducing the knowledge barrier to building apps',
            caption: 'Reducing the knowledge barrier to building apps'
          },
          {
            type: 'text',
            value: 'Instead of overwhelming users with a dense, expert-level interface, they are now presented with a layout that centers their conversation with the agent alongside the live rendered output of their application build.'
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/on-call/slide03.png`,
            alt: 'From prompt to working app',
            caption: 'Move the user from prompt to working app in a single step'
          }
        ]
      },
      {
        id: 'impact',
        title: 'Impact',
        content: [
          {
            type: 'heading',
            value: 'Impact'
          },
          {
            type: 'text',
            parts: [
              'I joined Replit after a round of layoffs, right at the moment they decided to pivot from a developer-targeted IDE to agentic coding for the masses. At that time, revenue was approximately $6M ARR.'
            ]
          },
          {
            type: 'text',
            parts: [
              'I was the only product designer working on the agentic project creation flow. After this product pivot and workflow redesign, new user dropoff in the app creation flow was reduced by a third. ARR quickly grew to $20M and is now at ', 
              { type: 'link', text: '$150M ARR a year later', url: 'https://www.cnbc.com/2025/12/04/google-replit-ai-vibe-coding-anthropic-cursor.html' },
              ', and there is still room for significant improvement.'
            ]
          }
        ]
      }
    ]
  },
  'status-pages': {
    title: 'Status pages redesign',
    subtitle: 'Incident.io.',
    sections: [
      {
        id: 'context',
        title: 'Context',
        content: [
          {
            type: 'heading',
            value: 'Context'
          },
          {
            type: 'text',
            value: 'Status pages are critical for communicating with customers during incidents. When something goes wrong, customers need to know what\'s happening, what\'s affected, and when it will be fixed.'
          },
          {
            type: 'text',
            value: 'Our existing status page solution was functional but basic. It lacked the polish and features that modern companies expected, and customers were frequently asking for improvements.'
          }
        ]
      },
      {
        id: 'problem',
        title: 'Problem',
        content: [
          {
            type: 'heading',
            value: 'Problem'
          },
          {
            type: 'text',
            value: 'The main issues were around customization, update workflows, and subscriber experience. Companies wanted status pages that matched their brand. Incident responders wanted faster ways to post updates. Subscribers wanted better notifications and historical views.'
          }
        ]
      },
      {
        id: 'approach',
        title: 'Approach',
        content: [
          {
            type: 'heading',
            value: 'Approach'
          },
          {
            type: 'text',
            value: 'I conducted a competitive analysis of status page products and interviewed customers about their needs. We identified three key areas: brand customization, update workflows, and subscriber management.'
          },
          {
            type: 'text',
            value: 'The redesign focused on making it easy for companies to create beautiful, on-brand status pages in minutes, streamlining the update process during incidents, and giving subscribers control over how they receive notifications.'
          }
        ]
      },
      {
        id: 'solution',
        title: 'Solution',
        content: [
          {
            type: 'heading',
            value: 'Solution'
          },
          {
            type: 'text',
            value: 'We launched a completely redesigned status page builder with live preview, custom branding options, and flexible theming. Updates could be posted directly from Slack during incidents, and subscribers could choose exactly which services they wanted to follow.'
          }
        ]
      },
      {
        id: 'impact',
        title: 'Impact',
        content: [
          {
            type: 'heading',
            value: 'Impact'
          },
          {
            type: 'text',
            value: 'Adoption increased significantly after the redesign, with many customers who had been using third-party tools switching to our status pages. Time to set up a new status page dropped from hours to minutes.'
          }
        ]
      }
    ]
  }
};

