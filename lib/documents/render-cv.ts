import { Document, Packer, Paragraph } from "docx";
import {
  makeBullet,
  makeBodyParagraph,
  makeContactParagraph,
  makeNameParagraph,
  makeRoleHeaderParagraph,
  makeSectionHeading,
} from "./shared";
import type { CvDocumentInput } from "./types";

export async function renderCvDocx(input: CvDocumentInput): Promise<Buffer> {
  const contactLine = [
    input.city,
    input.phone,
    input.email,
    input.linkedin,
  ].filter(Boolean) as string[];

  const children: Paragraph[] = [];

  children.push(makeNameParagraph(input.fullName));

  if (contactLine.length > 0) {
    children.push(makeContactParagraph(contactLine));
  }

  if (input.targetRole) {
    children.push(
      new Paragraph({
        text: input.targetRole,
        spacing: { after: 180 },
      })
    );
  }

  if (input.summary) {
    children.push(makeSectionHeading("Profile"));
    children.push(makeBodyParagraph(input.summary));
  }

  for (const section of input.sections) {
    children.push(makeSectionHeading(section.heading));

    // Structured role items: header with right-aligned date + justified bullets
    if (section.roleItems?.length) {
      for (const role of section.roleItems) {
        const headerParagraphs = makeRoleHeaderParagraph(
          role.title,
          role.company,
          role.location,
          role.dateRange,
        );
        children.push(...headerParagraphs);
        for (const bullet of role.bullets) {
          children.push(makeBullet(bullet));
        }
        // Breathing room between roles
        children.push(new Paragraph({ spacing: { after: 120 } }));
      }
    } else {
      // Fallback: plain items as bullets
      for (const item of section.items ?? []) {
        children.push(makeBullet(item));
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}