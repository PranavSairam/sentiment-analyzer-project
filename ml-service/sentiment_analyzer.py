import re
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from textblob import TextBlob
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import pickle
import os

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

class SentimentAnalyzer:
    def __init__(self):
        self.vectorizer = None
        self.model = None
        self.stop_words = set(stopwords.words('english'))
        self.load_or_create_model()
    
    def preprocess_text(self, text):
        """Preprocess text for sentiment analysis"""
        # Convert to lowercase
        text = text.lower()
        
        # Remove special characters and numbers
        text = re.sub(r'[^a-zA-Z\s]', '', text)
        
        # Tokenize
        tokens = word_tokenize(text)
        
        # Remove stopwords
        tokens = [token for token in tokens if token not in self.stop_words]
        
        # Join tokens back
        processed_text = ' '.join(tokens)
        
        return processed_text
    
    def analyze_sentiment_textblob(self, text):
        """Analyze sentiment using TextBlob"""
        blob = TextBlob(text)
        polarity = blob.sentiment.polarity
        
        # Convert polarity to sentiment
        if polarity > 0.1:
            sentiment = 'positive'
        elif polarity < -0.1:
            sentiment = 'negative'
        else:
            sentiment = 'neutral'
        
        # Convert polarity to confidence (0-1)
        confidence = abs(polarity)
        confidence = max(0.1, min(confidence, 1.0))  # Ensure confidence is between 0.1 and 1.0
        
        return sentiment, confidence
    
    def load_or_create_model(self):
        """Load existing model or create a new one"""
        model_path = 'sentiment_model.pkl'
        
        if os.path.exists(model_path):
            try:
                with open(model_path, 'rb') as f:
                    model_data = pickle.load(f)
                    self.vectorizer = model_data['vectorizer']
                    self.model = model_data['model']
                print("Loaded existing sentiment model")
            except:
                print("Failed to load existing model, creating new one")
                self.create_model()
        else:
            print("Creating new sentiment model")
            self.create_model()
    
    def create_model(self):
        """Create a simple sentiment analysis model"""
        # Sample training data (in a real application, you'd use a larger dataset)
        training_texts = [
            "This is amazing! I love it!",
            "Great product, highly recommended!",
            "Excellent service, very satisfied!",
            "Good quality, worth the money!",
            "Not bad, could be better",
            "Okay, but nothing special",
            "Average product, meets expectations",
            "Disappointing, poor quality",
            "Terrible experience, don't buy!",
            "Awful service, very unhappy!",
            "Worst product ever!",
            "Complete waste of money!",
            "I hate this, it's terrible!",
            "Very poor quality, avoid!",
            "Not worth the price at all!"
        ]
        
        training_labels = [
            'positive', 'positive', 'positive', 'positive',
            'neutral', 'neutral', 'neutral', 'neutral',
            'negative', 'negative', 'negative', 'negative',
            'negative', 'negative', 'negative'
        ]
        
        # Create TF-IDF vectorizer
        self.vectorizer = TfidfVectorizer(max_features=1000, ngram_range=(1, 2))
        
        # Transform training data
        X_train = self.vectorizer.fit_transform(training_texts)
        
        # Create and train model
        self.model = LogisticRegression(random_state=42, max_iter=1000)
        self.model.fit(X_train, training_labels)
        
        # Save model
        model_data = {
            'vectorizer': self.vectorizer,
            'model': self.model
        }
        with open('sentiment_model.pkl', 'wb') as f:
            pickle.dump(model_data, f)
    
    def analyze(self, text):
        """Analyze sentiment of the given text"""
        if not text or not text.strip():
            return 'neutral', 0.5
        
        # Preprocess text
        processed_text = self.preprocess_text(text)
        
        if not processed_text.strip():
            return 'neutral', 0.5
        
        try:
            # Use TextBlob for primary analysis
            sentiment, confidence = self.analyze_sentiment_textblob(text)
            
            # If we have a trained model, use it as a secondary check
            if self.model and self.vectorizer:
                # Transform text using the trained vectorizer
                text_vector = self.vectorizer.transform([processed_text])
                
                # Get prediction
                prediction = self.model.predict(text_vector)[0]
                prediction_proba = self.model.predict_proba(text_vector)[0]
                
                # Get confidence from model
                max_proba = max(prediction_proba)
                
                # Combine TextBlob and model results
                if sentiment == prediction:
                    # Both agree, increase confidence
                    confidence = (confidence + max_proba) / 2
                else:
                    # Use TextBlob result but keep reasonable confidence
                    confidence = max(confidence, 0.3)
            
            return sentiment, confidence
        
        except Exception as e:
            print(f"Error in sentiment analysis: {e}")
            # Fallback to TextBlob
            return self.analyze_sentiment_textblob(text) 