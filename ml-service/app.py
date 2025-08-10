from flask import Flask, request, jsonify
from flask_cors import CORS
from sentiment_analyzer import SentimentAnalyzer
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize sentiment analyzer
analyzer = SentimentAnalyzer()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'ml-sentiment-analyzer'})

@app.route('/predict', methods=['POST'])
def predict_sentiment():
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        text = data['text']
        
        if not text or not text.strip():
            return jsonify({'error': 'Empty text provided'}), 400
        
        # Analyze sentiment
        sentiment, confidence = analyzer.analyze(text)
        
        return jsonify({
            'text': text,
            'sentiment': sentiment,
            'confidence': confidence
        })
    
    except Exception as e:
        print(f"Error analyzing sentiment: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/batch-predict', methods=['POST'])
def batch_predict_sentiment():
    try:
        data = request.get_json()
        
        if not data or 'texts' not in data:
            return jsonify({'error': 'No texts provided'}), 400
        
        texts = data['texts']
        
        if not isinstance(texts, list) or len(texts) == 0:
            return jsonify({'error': 'Invalid texts format'}), 400
        
        results = []
        for text in texts:
            if text and text.strip():
                sentiment, confidence = analyzer.analyze(text)
                results.append({
                    'text': text,
                    'sentiment': sentiment,
                    'confidence': confidence
                })
            else:
                results.append({
                    'text': text,
                    'sentiment': 'neutral',
                    'confidence': 0.5
                })
        
        return jsonify({'results': results})
    
    except Exception as e:
        print(f"Error analyzing batch sentiment: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# Keep the old endpoints for backward compatibility
@app.route('/analyze', methods=['POST'])
def analyze_sentiment():
    return predict_sentiment()

@app.route('/analyze-batch', methods=['POST'])
def analyze_batch():
    return batch_predict_sentiment()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))

    app.run(host='0.0.0.0', port=port, debug=True)
    
