<!--
  Copyright Component
-->
<script>
  let currentYear = new Date().getFullYear();
</script>

<div class="copyright-notice">
  <div class="copyright-content">
    <p>© {currentYear} العتبة العسكرية المقدسة. جميع الحقوق محفوظة.</p>
    <p class="copyright-sub">نظام إحصاء الزوار - الإصدار 2.0</p>
  </div>
</div>

<style>
  .copyright-notice {
    background: rgba(22, 160, 133, 0.05);
    border: 1px solid rgba(22, 160, 133, 0.2);
    border-radius: 8px;
    padding: 20px;
    margin: 40px 0 20px;
    text-align: center;
    font-family: 'Cairo', sans-serif;
  }

  .copyright-content p {
    margin: 0;
    color: #16a085;
    font-weight: 600;
    font-size: 14px;
    line-height: 1.5;
  }

  .copyright-sub {
    color: #718096 !important;
    font-size: 12px !important;
    font-weight: 400 !important;
    margin-top: 4px !important;
  }

  :global(.dark-mode) .copyright-notice {
    background: rgba(22, 160, 133, 0.1);
    border-color: rgba(22, 160, 133, 0.3);
  }

  :global(.dark-mode) .copyright-content p {
    color: #16a085;
  }

  :global(.dark-mode) .copyright-sub {
    color: #a0aec0 !important;
  }
</style>