# Bu dosya, Vercel'in tüm /api isteklerini
# backend klasörünüzdeki ana uygulamanıza yönlendirmesini sağlar.

# backend/app/main.py dosyanızdaki "app" nesnesini import ediyoruz.
# Python'un klasörleri bulabilmesi için sys.path'e ekleme yapabiliriz.
import sys
import os

# Proje kök dizinini path'e ekleyerek 'backend' modülünün bulunmasını sağlıyoruz
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app.main import app

# 'app' değişkeninin burada olması Vercel'in onu bulması için yeterlidir.
# Vercel, bu 'app' nesnesini alıp bir sunucusuz fonksiyona çevirecektir.