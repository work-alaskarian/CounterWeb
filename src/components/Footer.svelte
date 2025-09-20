<script>
  import './styles/Footer.css';

  const currentYear = new Date().getFullYear();
  const hijriYear = currentYear - 579; // Approximate Hijri year calculation
</script>

<footer class="shrine-footer">
  <!-- Main Footer Section -->
  <div class="footer-main">
    <div class="footer-container">
      <!-- Logo and Description Section -->
      <div class="footer-section footer-about">
        <div class="footer-logo">
          <svg class="logo-icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 10 L30 30 L30 50 L50 70 L70 50 L70 30 Z" fill="currentColor" opacity="0.8"/>
            <circle cx="50" cy="40" r="15" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M50 25 L50 55 M35 40 L65 40" stroke="currentColor" stroke-width="2"/>
          </svg>
          <h3>العتبة العسكرية المقدسة</h3>
        </div>
        <p class="footer-description">
          نخدم الزائرين الكرام بكل تفانٍ وإخلاص، ونسعى لتوفير أفضل الخدمات للوافدين إلى الحرم الشريف
        </p>
      </div>

      <!-- Quick Links Section -->
      <div class="footer-section">
        <h4>روابط سريعة</h4>
        <ul class="footer-links">
          <li><a href="#home">الرئيسية</a></li>
          <li><a href="#services">الخدمات</a></li>
          <li><a href="#locations">المواقع المقدسة</a></li>
          <li><a href="#analytics">الإحصائيات</a></li>
          <li><a href="#contact">اتصل بنا</a></li>
        </ul>
      </div>

      <!-- Services Section -->
      <div class="footer-section">
        <h4>خدماتنا</h4>
        <ul class="footer-links">
          <li><a href="#visitor-count">إحصائيات الزوار</a></li>
          <li><a href="#live-monitoring">المراقبة المباشرة</a></li>
          <li><a href="#crowd-management">إدارة الحشود</a></li>
          <li><a href="#safety">الأمن والسلامة</a></li>
          <li><a href="#guidance">الإرشاد والتوجيه</a></li>
        </ul>
      </div>

      <!-- Contact Section -->
      <div class="footer-section">
        <h4>تواصل معنا</h4>
        <div class="contact-info">
          <div class="contact-item">
            <svg class="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 0118 0M12 2v10"/>
            </svg>
            <span>كربلاء المقدسة، العراق</span>
          </div>
          <div class="contact-item">
            <svg class="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 8l9 6 9-6M3 8v8a2 2 0 002 2h14a2 2 0 002-2V8"/>
            </svg>
            <span>info@alaskari.iq</span>
          </div>
          <div class="contact-item">
            <svg class="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 5a2 2 0 012-2h3l2 4-2 1a11 11 0 007 7l1-2 4 2v3a2 2 0 01-2 2A16 16 0 013 5"/>
            </svg>
            <span dir="ltr">+964 (0) 780 000 0000</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Divider -->
  <div class="footer-divider"></div>

  <!-- Copyright Section -->
  <div class="footer-copyright">
    <div class="copyright-container">
      <div class="copyright-text">
        <p>
          جميع الحقوق محفوظة © {currentYear} - {hijriYear} هـ | العتبة العسكرية المقدسة
        </p>
        <p class="copyright-sub">
          تم التطوير بإشراف قسم تقنية المعلومات والاتصالات
        </p>
      </div>

      <!-- Social Media Links -->
      <div class="social-links">
        <a href="#" aria-label="Facebook" class="social-link">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </a>
        <a href="#" aria-label="Twitter" class="social-link">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
          </svg>
        </a>
        <a href="#" aria-label="YouTube" class="social-link">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </a>
        <a href="#" aria-label="Instagram" class="social-link">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
          </svg>
        </a>
      </div>
    </div>
  </div>

  <!-- Islamic Pattern Decoration -->
  <div class="footer-pattern"></div>
</footer>