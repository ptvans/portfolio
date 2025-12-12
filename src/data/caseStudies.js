export const caseStudies = {
  'on-call': {
    title: 'Reimagining on-call software',
    subtitle: 'Incident.io.',
    sections: [
      {
        id: 'context',
        title: 'Context',
        content: [
          {
            type: 'image',
            src: '/images/case-studies/on-call/mobile-screens.png',
            alt: 'Sample screens from the on-call app',
            caption: 'Sample screens from the on-call app — switch theme to see light/dark examples'
          },
          {
            type: 'heading',
            value: 'Context'
          },
          {
            type: 'text',
            value: 'When I joined Incident.io, the company offered incident management tools focused on communication and coordination inside Slack. But customers still relied on third-party on-call products like PagerDuty and Opsgenie to route alerts — and they hated them.'
          },
          {
            type: 'text',
            value: 'PagerDuty in particular was powerful but dated: complex configuration, clunky UX, and a mobile app that was notoriously painful to use. Many of our customers were actively asking, "When are you going to build this too?"'
          },
          {
            type: 'text',
            value: 'Building our own on-call system was an enormous opportunity. PagerDuty is a billion-dollar business doing this one thing; if we could design something simpler, faster, and friendlier, we could unlock huge value for our users — and for the company.'
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
            value: 'On-call software touches every layer of an organisation: alert ingestion, routing, scheduling, escalation, and notifications. It\'s technically deep and full of configuration edge-cases.'
          },
          {
            type: 'text',
            value: 'PagerDuty\'s complexity allows it to handle every imaginable setup — but that same flexibility makes it painful to use day-to-day. Our challenge was to re-imagine on-call from the ground up: preserve the power, remove the pain.'
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
            value: 'We started by deeply understanding the problem space. I conducted extensive user research with our existing customers, studying how they used PagerDuty and other tools, what frustrated them most, and what they couldn\'t live without.'
          },
          {
            type: 'text',
            value: 'We identified key principles: make the common case simple, hide complexity until it\'s needed, and design for the mobile experience first (since responders are often on-call outside work hours).'
          },
          {
            type: 'text',
            value: 'I created prototypes and tested them with users iteratively, refining the flows based on feedback. We focused on three core areas: a streamlined scheduling interface, an intuitive mobile app for responders, and clear escalation policies that were easy to understand and configure.'
          }
        ]
      },
      {
        id: 'collaboration',
        title: 'Collaboration',
        content: [
          {
            type: 'heading',
            value: 'Collaboration'
          },
          {
            type: 'text',
            value: 'This project required close collaboration with engineering, product, and customer success teams. I worked closely with engineers to understand technical constraints and find creative solutions that balanced simplicity with power.'
          },
          {
            type: 'text',
            value: 'Regular design reviews and user testing sessions ensured we were solving the right problems. Customer success provided invaluable insights from support tickets and customer calls, helping us prioritize features that would have the biggest impact.'
          }
        ]
      },
      {
        id: 'multi-surface',
        title: 'Multi-surface design',
        content: [
          {
            type: 'heading',
            value: 'Multi-surface design'
          },
          {
            type: 'text',
            value: 'One of the unique challenges was designing for multiple surfaces: web dashboard for configuration, mobile app for responders, and Slack integration for notifications. Each surface had different constraints and user needs.'
          },
          {
            type: 'text',
            value: 'The web interface needed to handle complex configuration while remaining approachable. The mobile app needed to be fast and reliable under pressure, with notifications that cut through the noise. The Slack integration needed to feel native while providing just enough information and actions.'
          },
          {
            type: 'image',
            src: '/images/case-studies/on-call/desktop-interface.png',
            alt: 'Desktop scheduling interface',
            caption: 'Web interface for managing on-call schedules'
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
            value: 'The final product launched with a beautiful mobile app, intuitive scheduling interface, and powerful routing capabilities. Early feedback was overwhelmingly positive, with customers praising the ease of use and reliability.'
          },
          {
            type: 'text',
            value: 'We achieved our goal of preserving power while removing pain. Configuration that took hours in PagerDuty now took minutes. The mobile app became something people actually wanted to use, not dreaded.'
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
            value: 'Within six months of launch, dozens of customers had migrated from PagerDuty to our on-call product. Support tickets related to on-call were minimal compared to other features, indicating the UX was intuitive and robust.'
          },
          {
            type: 'text',
            value: 'The mobile app achieved a 4.8-star rating on the App Store, with reviewers specifically calling out the superior UX compared to alternatives. The product became a key differentiator in sales conversations and helped accelerate company growth.'
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

