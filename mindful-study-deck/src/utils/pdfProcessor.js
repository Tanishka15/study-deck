// Import PDF.js library
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker with fallback
try {
  if (pdfjsLib.GlobalWorkerOptions) {
    // Try to use the version-specific worker
    const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
    console.log('PDF.js worker configured:', workerSrc);
  }
} catch (error) {
  console.warn('Could not configure PDF.js worker:', error);
}

/**
 * Extract text from PDF file
 * @param {File} file - PDF file object
 * @returns {Promise<string>} - Extracted text
 */
export async function extractTextFromPDF(file) {
  try {
    console.log('Starting PDF text extraction...');
    console.log('File name:', file.name, 'Size:', file.size, 'bytes');
    console.log('PDF.js version:', pdfjsLib.version);
    
    // Validate file
    if (!file || file.size === 0) {
      throw new Error('Invalid or empty PDF file');
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('File does not appear to be a PDF');
    }
    
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    console.log('ArrayBuffer created, size:', arrayBuffer.byteLength);
    
    if (arrayBuffer.byteLength === 0) {
      throw new Error('PDF file is empty');
    }
    
    // Load PDF document with additional options
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      verbosity: 0, // Suppress warnings
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + pdfjsLib.version + '/cmaps/',
      cMapPacked: true,
    });
    
    console.log('Loading PDF document...');
    const pdf = await loadingTask.promise;
    console.log('PDF loaded successfully. Pages:', pdf.numPages);
    
    if (pdf.numPages === 0) {
      throw new Error('PDF has no pages');
    }
    
    let fullText = '';
    let totalCharacters = 0;
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        console.log(`Extracting text from page ${i}/${pdf.numPages}...`);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Extract text items with better formatting
        const pageText = textContent.items
          .map(item => {
            // Some items might not have str property
            if (item.str) {
              return item.str;
            }
            return '';
          })
          .filter(text => text.trim().length > 0)
          .join(' ');
        
        if (pageText.trim().length > 0) {
          fullText += pageText + '\n\n';
          totalCharacters += pageText.length;
          console.log(`Page ${i} extracted: ${pageText.length} characters`);
        } else {
          console.warn(`Page ${i} appears to be empty or image-based`);
        }
      } catch (pageError) {
        console.error(`Error extracting text from page ${i}:`, pageError);
        // Continue with next page instead of failing completely
      }
    }
    
    console.log('Total text extracted:', fullText.length, 'characters from', pdf.numPages, 'pages');
    
    // Validate extracted text
    if (!fullText || fullText.trim().length === 0) {
      throw new Error('PDF appears to be empty or contains no extractable text. This might be a scanned/image-based PDF.');
    }

    if (fullText.trim().length < 100) {
      console.warn('Very little text extracted. PDF might be image-based or have formatting issues.');
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    
    // Provide more helpful error messages
    let errorMessage = 'Failed to extract text from PDF';
    
    if (error.message.includes('Invalid PDF structure')) {
      errorMessage += ': The PDF file appears to be corrupted or invalid.';
    } else if (error.message.includes('Password')) {
      errorMessage += ': The PDF is password-protected.';
    } else if (error.message.includes('image-based')) {
      errorMessage += ': This appears to be a scanned/image-based PDF. Text extraction requires text-based PDFs.';
    } else {
      errorMessage += `: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Chunk text into logical sections
 * @param {string} text - Full text from PDF
 * @param {number} maxChunkSize - Maximum characters per chunk
 * @returns {string[]} - Array of text chunks
 */
export function chunkText(text, maxChunkSize = 2000) {
  if (!text || typeof text !== 'string') {
    console.error('Invalid text provided to chunkText');
    return [];
  }

  // Clean up the text
  const cleanedText = text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
    .trim();

  // Split by paragraphs
  const paragraphs = cleanedText.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  if (paragraphs.length === 0) {
    console.warn('No paragraphs found in text');
    return [cleanedText];
  }

  const chunks = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    
    // Skip very short paragraphs (likely artifacts)
    if (trimmedParagraph.length < 10) {
      continue;
    }
    
    // If single paragraph is larger than max size, split it
    if (trimmedParagraph.length > maxChunkSize) {
      // Save current chunk if it exists
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // Split large paragraph by sentences
      const sentences = trimmedParagraph.match(/[^.!?]+[.!?]+/g) || [trimmedParagraph];
      let tempChunk = '';
      
      for (const sentence of sentences) {
        if (tempChunk.length + sentence.length > maxChunkSize && tempChunk.length > 0) {
          chunks.push(tempChunk.trim());
          tempChunk = sentence;
        } else {
          tempChunk += (tempChunk ? ' ' : '') + sentence;
        }
      }
      
      if (tempChunk.trim().length > 0) {
        chunks.push(tempChunk.trim());
      }
      
      continue;
    }
    
    // Check if adding this paragraph exceeds the limit
    if (currentChunk.length + trimmedParagraph.length + 2 > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmedParagraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
    }
  }
  
  // Add the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  // Filter out chunks that are too small
  const validChunks = chunks.filter(chunk => chunk.length >= 50);
  
  console.log(`Created ${validChunks.length} text chunks from ${paragraphs.length} paragraphs`);
  
  if (validChunks.length === 0) {
    console.warn('No valid chunks created, returning original text as single chunk');
    return [cleanedText];
  }
  
  return validChunks;
}

/**
 * Validate if a file is a valid PDF
 * @param {File} file - File to validate
 * @returns {boolean} - True if valid PDF
 */
export function isValidPDF(file) {
  if (!file) return false;
  
  // Check file type
  if (file.type === 'application/pdf') return true;
  
  // Check file extension as fallback
  if (file.name && file.name.toLowerCase().endsWith('.pdf')) return true;
  
  return false;
}

/**
 * Get PDF metadata
 * @param {File} file - PDF file object
 * @returns {Promise<Object>} - PDF metadata
 */
export async function getPDFMetadata(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const metadata = await pdf.getMetadata();
    
    return {
      numPages: pdf.numPages,
      title: metadata.info.Title || file.name,
      author: metadata.info.Author || 'Unknown',
      subject: metadata.info.Subject || '',
      creator: metadata.info.Creator || '',
      producer: metadata.info.Producer || '',
      creationDate: metadata.info.CreationDate || null,
      modificationDate: metadata.info.ModDate || null,
    };
  } catch (error) {
    console.error('Error getting PDF metadata:', error);
    return {
      numPages: 0,
      title: file.name,
      error: error.message
    };
  }
}