# 🆓 Getting Your FREE Google Gemini API Key

Follow these simple steps to get your free Gemini API key and start generating flashcards!

## Step-by-Step Guide

### 1. Visit Google AI Studio
Go to: **https://makersuite.google.com/app/apikey**

### 2. Sign In
- Click "Sign in" in the top right
- Use your Google account (Gmail)
- If you don't have one, create a free Google account

### 3. Create API Key
- Click the **"Get API Key"** or **"Create API Key"** button
- Select "Create API key in new project" (recommended for first-time users)
- Or choose an existing Google Cloud project

### 4. Copy Your Key
- Your API key will be displayed
- Click the **copy icon** to copy it
- Save it somewhere safe (but DON'T commit to Git!)

### 5. Paste in App
- Go back to Mindful Study Deck
- Paste your API key in the input field
- Upload a PDF and start generating flashcards!

## What You Get (FREE Tier)

### Generous Limits
✅ **60 requests per minute**
✅ **1,500 requests per day**
✅ **1,000,000 tokens per day**
✅ **No credit card required**
✅ **No expiration**

### Perfect For:
- Personal study and learning
- Generating flashcards from textbooks
- Processing multiple PDFs daily
- Experimenting and testing

### Typical Usage:
- **1 PDF (10 pages)** ≈ 5-10 API requests
- **Generate 50 flashcards** ≈ 10-15 requests
- **Daily study session** ≈ 20-30 requests
- **Well within free limits!** 🎉

## API Key Security

### DO ✅
- Keep your API key private
- Use it only in trusted applications
- Regenerate if you think it's compromised
- Store in environment variables for production

### DON'T ❌
- Share your API key publicly
- Commit it to Git/GitHub
- Use it in client-side code in production (use backend proxy)
- Post it in forums or chat

## Troubleshooting

### "Invalid API Key" Error
1. Check you copied the full key
2. Make sure no extra spaces
3. Try generating a new key
4. Ensure you're signed in to the correct Google account

### "Rate Limit Exceeded"
1. You've hit the 60 requests/minute limit
2. Wait 1 minute and try again
3. For production, implement request queuing
4. Consider upgrading to paid tier if needed

### "Permission Denied"
1. API key might be restricted
2. Check API key settings in Google Cloud Console
3. Ensure Generative Language API is enabled
4. Try creating a new API key

### Can't Find "Get API Key" Button
1. Make sure you're signed in
2. Try a different browser
3. Clear cache and cookies
4. Use incognito/private mode

## Managing Your API Key

### View Keys
- Go to https://makersuite.google.com/app/apikey
- See all your created API keys
- View usage statistics

### Regenerate Key
1. Go to Google AI Studio
2. Find your API key
3. Click "Regenerate" or "Create new key"
4. Update your app with new key

### Delete Key
1. Go to Google AI Studio
2. Find the API key to delete
3. Click delete/trash icon
4. Confirm deletion

### Monitor Usage
1. Go to Google Cloud Console
2. Navigate to APIs & Services → Dashboard
3. Click on "Generative Language API"
4. View usage metrics and quotas

## Upgrading to Paid Tier (Optional)

If you need more capacity:

### Higher Limits
- 1,000 requests per minute
- 30,000 requests per day
- Pay-as-you-go pricing
- Enterprise support

### Pricing (as of November 2025)
- **Gemini Pro**: $0.00025 per 1K characters input
- **Very affordable**: ~$0.01-0.05 per typical PDF
- Only pay for what you use

### How to Upgrade
1. Go to Google Cloud Console
2. Enable billing for your project
3. API automatically uses paid tier
4. No changes needed in code

## Comparison: Gemini vs OpenAI

| Feature | Gemini (Free) | OpenAI GPT-4 |
|---------|---------------|--------------|
| Cost | FREE | ~$0.03/1K tokens |
| Rate Limit | 60/min | Varies by tier |
| Daily Limit | 1,500 requests | Based on $ |
| Setup | Google account | Credit card required |
| Quality | Excellent | Excellent |
| Best For | Students, personal use | Production apps |

## Best Practices

### Efficient Usage
```javascript
// Batch requests when possible
const chunks = chunkText(pdfText, 2000); // Larger chunks
const cards = await generateFlashcards(chunks, apiKey);

// Don't regenerate unnecessarily
// Save generated cards in state
// Only regenerate when PDF changes
```

### Error Handling
```javascript
try {
  const cards = await generateFlashcards(chunks, apiKey);
} catch (error) {
  if (error.message.includes('quota')) {
    // Rate limit hit, retry after delay
  } else if (error.message.includes('invalid')) {
    // Bad API key, prompt user to check
  }
}
```

### Production Tips
1. **Use backend proxy**: Don't expose API key in client
2. **Implement caching**: Store generated cards
3. **Add rate limiting**: Queue requests properly
4. **Monitor usage**: Track API calls
5. **Handle errors gracefully**: Retry logic, fallbacks

## Getting Help

### Resources
- **Gemini API Docs**: https://ai.google.dev/docs
- **Google AI Studio**: https://makersuite.google.com
- **Community Forum**: https://discuss.ai.google.dev
- **Stack Overflow**: Tag with `google-gemini`

### Common Issues
1. **API not working**: Ensure Generative Language API is enabled
2. **Slow responses**: Check your internet connection
3. **JSON parsing errors**: Gemini might return markdown, handle both formats
4. **Character encoding**: Ensure UTF-8 encoding for PDFs

## Example: First API Call

Once you have your key, test it:

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI('YOUR_API_KEY');
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const prompt = "Explain quantum computing in simple terms";
const result = await model.generateContent(prompt);
const response = await result.response;
const text = response.text();

console.log(text); // Should see an explanation
```

If this works, you're all set! 🎉

## FAQs

**Q: Do I need a credit card?**
A: No! Free tier requires only a Google account.

**Q: Will I be charged automatically?**
A: No. Free tier stays free. Paid tier requires explicit billing setup.

**Q: Can I use it for commercial projects?**
A: Yes, but review Google's terms of service and consider paid tier.

**Q: How long does the key last?**
A: Indefinitely, unless you delete it or violate terms.

**Q: Can I have multiple keys?**
A: Yes! Create separate keys for different projects.

**Q: Is my data private?**
A: Read Google's privacy policy. Generally, API calls are processed securely.

---

**You're all set! Enjoy FREE AI-powered flashcard generation! 🚀📚**

Questions? Check the docs or ask in the community forum!
