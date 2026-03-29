import { Document, Packer, Paragraph } from "docx";
import { makeBodyParagraph, makeRightAlignedParagraph } from "./shared";
import type { CoverLetterDocumentInput } from "./types";

export async function renderCoverLetterDocx(
  input: CoverLetterDocumentInput
): Promise<Buffer> {
  const children: Paragraph[] = [];

  const senderLines = [
    input.fullName,
    ...(input.addressLines ?? []),
    input.phone,
    input.email,
    input.linkedin,
  ].filter(Boolean) as string[];

  for (const line of senderLines) {
    children.push(
      new Paragraph({
        text: line,
        spacing: { after: 40 },
      })
    );
  }

  children.push(new Paragraph({ text: "" }));

  const recipientLines = [
    input.recipientName,
    input.recipientRole,
    input.companyName,
    ...(input.companyAddressLines ?? []),
  ].filter(Boolean) as string[];

  for (const line of recipientLines) {
    children.push(
      new Paragraph({
        text: line,
        spacing: { after: 40 },
      })
    );
  }

  children.push(new Paragraph({ text: "" }));

  if (input.dateLine) {
    children.push(makeRightAlignedParagraph(input.dateLine));
  }

  if (input.subject) {
    children.push(
      new Paragraph({
        text: input.subject,
        bold: true,
        spacing: { after: 200 },
      })
    );
  }

  children.push(
    new Paragraph({
      text: input.greeting || "Dear Hiring Team,",
      spacing: { after: 180 },
    })
  );

  for (const paragraph of input.bodyParagraphs) {
    children.push(makeBodyParagraph(paragraph));
  }

  children.push(
    new Paragraph({
      text: input.closing || "Kind regards,",
      spacing: {
        before: 120,
        after: 220,
      },
    })
  );

  children.push(
    new Paragraph({
      text: input.fullName,
    })
  );

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