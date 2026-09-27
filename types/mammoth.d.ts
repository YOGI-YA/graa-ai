declare module 'mammoth' {
  export interface RawTextResult {
    value: string
    messages: any[]
  }

  export interface ExtractRawTextInput {
    buffer?: Buffer
    path?: string
    arrayBuffer?: ArrayBuffer
  }

  export function extractRawText(input: ExtractRawTextInput): Promise<RawTextResult>
  export function convertToHtml(input: ExtractRawTextInput, options?: any): Promise<RawTextResult>
}
