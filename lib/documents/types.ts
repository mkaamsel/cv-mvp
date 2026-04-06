export type CvRoleItem = {
  title: string;
  company?: string;
  location?: string;
  dateRange?: string;
  bullets: string[];
};

export type CvSection = {
  heading: string;
  items?: string[];
  roleItems?: CvRoleItem[];
};

export type CvDocumentInput = {
  fullName: string;
  targetRole?: string;
  city?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  summary?: string;
  sections: CvSection[];
};

export type CoverLetterDocumentInput = {
  fullName: string;
  addressLines?: string[];
  email?: string;
  phone?: string;
  linkedin?: string;
  city?: string;
  dateLine?: string;
  recipientName?: string;
  recipientRole?: string;
  companyName?: string;
  companyAddressLines?: string[];
  subject?: string;
  greeting?: string;
  bodyParagraphs: string[];
  closing?: string;
};