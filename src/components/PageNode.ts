import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';

export const CustomDocument = Document.extend({
  content: 'paragraph',
});

export const CustomParagraph = Paragraph.extend({
  // You can add custom paragraph configurations here if needed
});

export const CustomText = Text.extend({
  // You can add custom text configurations here if needed
});