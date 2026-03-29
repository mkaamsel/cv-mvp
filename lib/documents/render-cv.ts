import { Document, Packer, Paragraph } from "docx";
import { makeBullet, makeContactParagraph, makeNameParagraph, makeSectionHeading } from "./shared";
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
    children.push(
      new Paragraph({
        text: input.summary,
        spacing: {
          after: 180,
          line: 300,
        },
      })
    );
  }

  for (const section of input.sections) {
    children.push(makeSectionHeading(section.heading));

    for (const item of section.items) {
      children.push(makeBullet(item));
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