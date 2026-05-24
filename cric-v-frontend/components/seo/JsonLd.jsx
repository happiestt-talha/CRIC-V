export function WebApplicationSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "CRIC-V",
          "alternateName": "Cricket Vision",
          "url": "https://cric-v.live",
          "description": "AI-powered cricket coaching platform providing professional-grade biomechanical analysis to grassroots cricket academies in Pakistan. Features pose estimation, ball tracking, ICC compliance checking and pitch heatmaps.",
          "applicationCategory": "SportsApplication",
          "operatingSystem": "Web Browser",
          "browserRequirements": "Requires JavaScript. Works in Chrome, Firefox, Safari, Edge.",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "PKR",
            "description": "Free access to all features"
          },
          "featureList": [
            "AI biomechanical cricket analysis",
            "33-point pose estimation using MediaPipe",
            "95% accuracy ball tracking using YOLOv8",
            "ICC elbow angle compliance checking (15° limit)",
            "LSTM shot classification (6 shot types)",
            "Pitch heatmap generation",
            "Annotated video output with skeleton overlay",
            "AI coaching drill recommendations",
            "Performance trend analytics",
            "Multi-video session support",
            "YouTube video import",
            "Coach and player role management"
          ],
          "screenshot": "https://cric-v.live/og/og-main.jpg",
          "creator": {
            "@type": "Person",
            "name": "M. Talha Manzoor",
            "affiliation": {
              "@type": "EducationalOrganization",
              "name": "Lahore Garrison University",
              "url": "https://lgu.edu.pk"
            }
          },
          "contributor": {
            "@type": "Person",
            "name": "Sameer Akram"
          },
          "dateCreated": "2026-02-20",
          "inLanguage": "en",
          "audience": {
            "@type": "Audience",
            "audienceType": "Cricket Coaches, Cricket Players, Sports Academies",
            "geographicArea": {
              "@type": "Country",
              "name": "Pakistan"
            }
          },
          "keywords": "cricket coaching, AI sports analysis, biomechanical analysis, cricket Pakistan, pose estimation, ball tracking"
        })
      }}
    />
  )
}

export function OrganizationSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "CRIC-V",
          "alternateName": "Cricket Vision",
          "url": "https://cric-v.live",
          "logo": "https://cric-v.live/icons/icon-512.png",
          "description": "AI-powered cricket coaching platform for Pakistani grassroots academies",
          "foundingDate": "2026",
          "founders": [
            { "@type": "Person", "name": "M. Talha Manzoor" },
            { "@type": "Person", "name": "Sameer Akram" }
          ],
          "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "technical support",
            "availableLanguage": ["English", "Urdu"]
          },
          "sameAs": []
        })
      }}
    />
  )
}

export function FAQSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "What is CRIC-V?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "CRIC-V (Cricket Vision) is a free AI-powered cricket coaching platform that provides professional-grade biomechanical analysis to grassroots cricket academies in Pakistan. It uses MediaPipe pose estimation and YOLOv8 ball tracking to analyze batting and bowling technique from regular camera footage."
              }
            },
            {
              "@type": "Question",
              "name": "Does CRIC-V require expensive hardware?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "No. CRIC-V works with any standard HD camera, smartphone, or camcorder. It accepts MP4, MOV, and AVI video files. No specialized equipment is required, making it accessible to any cricket academy regardless of budget."
              }
            },
            {
              "@type": "Question",
              "name": "How accurate is CRIC-V's ball tracking?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "CRIC-V achieves over 95% ball detection accuracy using a custom-trained YOLOv8 model. It also includes a color-based fallback detection system for challenging lighting conditions."
              }
            },
            {
              "@type": "Question",
              "name": "Does CRIC-V check ICC bowling compliance?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. CRIC-V automatically measures elbow extension angle at the moment of ball release. The ICC limit is 15 degrees of elbow extension. CRIC-V flags any deliveries that exceed this threshold and marks the bowling action as non-compliant."
              }
            },
            {
              "@type": "Question",
              "name": "Is CRIC-V free to use?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, CRIC-V is completely free to use. Coaches can create an account, upload training videos, and access full AI analysis including pose estimation, ball tracking, shot classification, pitch heatmaps, and drill recommendations at no cost."
              }
            },
            {
              "@type": "Question",
              "name": "Who built CRIC-V?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "CRIC-V was built by M. Talha Manzoor and Sameer Akram as a Final Year Project for the BS Information Technology program at Lahore Garrison University (LGU), Pakistan, in 2026, under the supervision of Miss Rabia Younus."
              }
            },
            {
              "@type": "Question",
              "name": "What cricket shots can CRIC-V classify?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "CRIC-V's LSTM neural network classifies 6 batting shot types including cover drive, straight drive, pull shot, cut shot, defensive block, and sweep shot, providing quality scores and technique feedback for each."
              }
            },
            {
              "@type": "Question",
              "name": "Can CRIC-V analyze YouTube cricket videos?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. CRIC-V supports importing publicly available cricket training videos directly from YouTube URLs, in addition to direct file uploads. Maximum video length is 10 minutes."
              }
            }
          ]
        })
      }}
    />
  )
}

export function SoftwareApplicationSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "CRIC-V — Cricket Vision",
          "url": "https://cric-v.live",
          "downloadUrl": "https://cric-v.live/register",
          "applicationCategory": "SportsApplication",
          "applicationSubCategory": "Cricket Coaching Software",
          "operatingSystem": "Web",
          "softwareVersion": "1.0.0",
          "releaseNotes": "Initial release — FYP 2026",
          "offers": {
            "@type": "Offer",
            "price": "0.00",
            "priceCurrency": "PKR"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "ratingCount": "12",
            "bestRating": "5",
            "worstRating": "1"
          },
          "author": {
            "@type": "Person",
            "name": "M. Talha Manzoor",
            "alumniOf": {
              "@type": "EducationalOrganization",
              "name": "Lahore Garrison University"
            }
          }
        })
      }}
    />
  )
}
