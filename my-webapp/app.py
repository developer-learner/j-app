from flask import Flask, render_template

app = Flask(__name__, static_folder='public', template_folder='templates')

@app.route('/')
def home():
    return render_template("index.html")  # Flask version for dynamic pages

if __name__ == "__main__":
    app.run(debug=True)