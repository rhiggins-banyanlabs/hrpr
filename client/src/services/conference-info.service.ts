interface ConferenceInfo {
  topic: string;
  keywords: string[];
  information: string;
}

class ConferenceInfoService {
  private conferenceInfo: ConferenceInfo[] = [
    {
      topic: "ADA Assistance",
      keywords: ["ada", "disability", "disabilities", "assistance", "wheelchair", "accessible", "accessibility", "help", "special needs"],
      information: "If you need assistance or have accessibility needs, please contact American Correctional Association show management at 703-981-4738. We're here to help ensure everyone can fully participate in the conference."
    },
    {
      topic: "Badge Information",
      keywords: ["badge", "identification", "id", "name tag", "credential", "lost badge", "replacement badge"],
      information: "Please wear your ACA badge at all times during the conference. It's your passport to all sessions, the Exhibit Hall, workshops and social events. Badge checkers will be at each event. If you lose your badge, you can replace it at the ACA registration area for a $25 fee."
    },
    {
      topic: "Business Center",
      keywords: ["business center", "fedex", "fed ex", "federal express", "printing", "print", "copies", "copy", "shipping", "ship", "mail", "package", "fax", "scan", "office services"],
      information: "The closest FedEx Store to the Colorado Convention Center is at 650 15th Street. It's open from 8 AM to 6 PM daily for all your business needs including printing, copying, shipping, and other office services."
    },
    {
      topic: "Cell Phone Policy",
      keywords: ["cell phone", "phone", "mobile", "silence", "quiet", "ringer"],
      information: "Please remember to turn your cell phones off or to silent mode during sessions, workshops and meetings. Phone use is not permitted during these events."
    },
    {
      topic: "Continuing Education",
      keywords: ["continuing education", "ce", "ceu", "credits", "professional development", "certification"],
      information: "Visit the ACA professional development staff in the ACA Connect Hub and Information & Technology Booth for continuing education opportunities. Details are on pages 76-77 of your program guide."
    },
    {
      topic: "Exhibitor Service",
      keywords: ["exhibitor service", "exhibitor help", "booth help", "vendor service", "exhibitor counter", "service counter", "exhibitor desk", "exhibitor support"],
      information: "The Exhibitor Service Counter is located in Exhibit Hall A/B for any exhibitor needs."
    },
    {
      topic: "Facility Tours",
      keywords: ["facility tour", "tours", "prison tour", "jail tour", "correctional facility", "visit facility"],
      information: "Facility tours are offered by the Host Committee. Sign up during registration hours at the registration area. Space is limited, so sign up early! See page 52 for details."
    },
    {
      topic: "Food Service",
      keywords: ["food", "restaurant", "lunch", "dinner", "breakfast", "coffee", "snacks", "dining", "eat", "hungry"],
      information: "A variety of food and beverage outlets are located outside the Colorado Convention Center and in the surrounding area."
    },
    {
      topic: "Lost and Found",
      keywords: ["lost and found", "lost", "found", "missing", "left behind", "forgot"],
      information: "If you've lost an item, check with the ACA Registration Desk. Found items should be given to ACA show management. Items not retrieved by end of day go to building security."
    },
    {
      topic: "Materials Distribution",
      keywords: ["flyers", "brochures", "handouts", "materials", "distribution", "promotional"],
      information: "Distribution of promotional materials is prohibited in registration, workshop, and exhibit areas except within an exhibitor's assigned booth. Prohibited materials will be removed."
    },
    {
      topic: "Non-Exhibitor Registration",
      keywords: ["non-exhibitor", "consultant", "visitor", "non-vendor"],
      information: "Companies or consultants without exhibit space must register and pay the non-exhibitor rate. Failure to register properly may result in penalties and jeopardize future participation."
    },
    {
      topic: "Parking",
      keywords: ["parking", "park", "garage", "car", "vehicle", "lot"],
      information: "The Colorado Convention Center has an onsite covered parking garage with limited spaces, open 24/7. Use the automated pay stations - scan the QR code or use text prompt to purchase parking. Details at: https://denverconvention.com/parking"
    },
    {
      topic: "Photography Policy",
      keywords: ["photo", "photography", "pictures", "video", "recording", "camera"],
      information: "Photography and video recording are prohibited in the exhibit hall, meeting rooms and lobbies during show hours. Exhibitors may photograph only their own booth before/after hours. Any recording during show hours needs ACA management approval."
    },
    {
      topic: "Show Management",
      keywords: ["show management", "management office", "aca office", "help desk"],
      information: "The Show Management Office is located in West Office Suite E1."
    },
    {
      topic: "Smoking Policy",
      keywords: ["smoking", "smoke", "cigarette", "vaping", "tobacco"],
      information: "Smoking is not permitted inside the convention center or within 25 feet of entrances. Smoking is only allowed in designated outdoor areas."
    },
    {
      topic: "Social Media",
      keywords: ["social media", "facebook", "twitter", "instagram", "linkedin", "social"],
      information: "Follow ACA on social media! Facebook: americancorrectionalassociation, Twitter: @acainfo, LinkedIn: linkedin.com/company/american-correctional-association, Instagram: @amercorrectionalassoc"
    },
    {
      topic: "Solicitation Policy",
      keywords: ["solicitation", "soliciting", "selling", "sales"],
      information: "Solicitation by non-exhibitors is strictly prohibited. Violators will have credentials revoked and be asked to leave."
    },
    {
      topic: "Workshop Information",
      keywords: ["workshop", "session", "speaker", "schedule", "seating"],
      information: "Workshop content and speakers are subject to change. Seating is first come, first served. See pages 80-138 for workshop details."
    },
    {
      topic: "Worship Services",
      keywords: ["worship", "church", "prayer", "religious", "service", "faith"],
      information: "Worship services are scheduled during the conference. See page 49 for specific times and locations."
    },
    {
      topic: "Prize Drawing",
      keywords: ["prize", "raffle", "drawing", "united airlines", "marriott", "gift card", "win", "contest"],
      information: "Don't forget to visit the sponsoring booths in the Exhibit Hall to get your ticket stamped for a chance to win a United Airlines gift card and Marriott Bonvoy points!"
    }
  ];

  searchInfo(query: string): string | null {
    const lowerQuery = query.toLowerCase();
    
    // Find the best matching topic
    let bestMatch: ConferenceInfo | null = null;
    let bestScore = 0;
    
    for (const info of this.conferenceInfo) {
      let score = 0;
      
      // Check for keyword matches
      for (const keyword of info.keywords) {
        if (lowerQuery.includes(keyword)) {
          score += keyword.split(' ').length; // Multi-word matches score higher
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = info;
      }
    }
    
    return bestMatch ? bestMatch.information : null;
  }

  getAllTopics(): string[] {
    return this.conferenceInfo.map(info => info.topic);
  }

  getInfoByTopic(topic: string): string | null {
    const info = this.conferenceInfo.find(i => 
      i.topic.toLowerCase() === topic.toLowerCase()
    );
    return info ? info.information : null;
  }
}

export const conferenceInfoService = new ConferenceInfoService();