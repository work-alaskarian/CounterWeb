<script>
	import LiveCounter from './components/LiveCounter.svelte';
	import LocationsDashboard from './components/LocationsDashboard.svelte';
	import AnalyticsDashboard from './components/AnalyticsDashboard.svelte';
	import Map from './components/Map.svelte';
	import NewAnalyticsTest from './components/NewAnalyticsTest.svelte';
	// import CoordinatesDisplay from './components/CoordinatesDisplay.svelte';

	let currentPage = 'live-counter';
	let mouseCoords = { lat: 0, lng: 0 };

	const sections = [
		{ id: 'hero', name: 'الرئيسية', icon: 'home' },
		{ id: 'live-counter', name: 'العداد المباشر', icon: 'analytics' },
		{ id: 'locations', name: 'مواقع متعددة', icon: 'location_on' },
		{ id: 'analytics', name: 'لوحة تحكم التحليلات', icon: 'dashboard' },
		{ id: 'new-analytics', name: 'اختبار النظام الجديد', icon: 'science' },
		{ id: 'map', name: 'الخريطة', icon: 'map' }
	];

	const timeframes = ['Hourly', 'Daily', 'Weekly', 'Monthly'];
	let timeframe = 'Hourly';
	let activeSection = 'hero';
	let isDarkMode = false;

	function scrollToSection(sectionId) {
		const element = document.getElementById(sectionId);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth' });
			activeSection = sectionId;
		}
	}

	// Track scroll position to update active section
	function handleScroll() {
		const sections = ['hero', 'live-counter', 'locations', 'analytics', 'new-analytics'];
		let currentSection = 'hero';
		
		for (const sectionId of sections) {
			const element = document.getElementById(sectionId);
			if (element) {
				const rect = element.getBoundingClientRect();
				if (rect.top <= 100 && rect.bottom >= 100) {
					currentSection = sectionId;
					break;
				}
			}
		}
		
		if (currentSection !== activeSection) {
			activeSection = currentSection;
		}
	}

	// Dark mode toggle function
	function toggleDarkMode() {
		isDarkMode = !isDarkMode;
		document.documentElement.classList.toggle('dark-mode', isDarkMode);
		localStorage.setItem('darkMode', isDarkMode);
	}

	// Add scroll listener
	import { onMount, onDestroy } from 'svelte';
	import { 
		refreshAllData, 
		startAutoRefresh, 
		stopAutoRefresh,
		setupRealTimeUpdates
	} from './lib/stores/analytics.js';
	
	let unsubscribeRealTime = null;
	
	onMount(async () => {
		// Check for saved dark mode preference
		const savedDarkMode = localStorage.getItem('darkMode') === 'true';
		if (savedDarkMode) {
			isDarkMode = true;
			document.documentElement.classList.add('dark-mode');
		}

		// Initialize analytics data
		console.log('🚀 Initializing CounterWeb with real-time analytics...');
		
		try {
			// Load initial data
			await refreshAllData();
			
			// Setup real-time updates
			unsubscribeRealTime = setupRealTimeUpdates();
			
			// Start auto-refresh
			startAutoRefresh(30000); // Every 30 seconds
			
			console.log('✅ CounterWeb analytics integration ready!');
		} catch (error) {
			console.error('❌ Failed to initialize analytics:', error);
		}

		window.addEventListener('scroll', handleScroll);
		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});

	onDestroy(() => {
		if (unsubscribeRealTime) {
			unsubscribeRealTime();
		}
		stopAutoRefresh();
	});

	// Props for the single LiveCounter (formerly LocationCard)
	// Use the main entrance location for the hero display - no fake initialCount
	const mainLocation = { id: 'main-entrance', name: 'المدخل الرئيسي' };
	const displayTheme = { color: '#16a085', rgb: '22, 160, 133' };
	let displayTimeframe = 'Hourly'; // Can be made reactive if needed

</script>

<div class="app">
	<!-- Navigation Header -->
	<header class="navigation-header">
		<div class="brand">
			<h1>نظام عداد الأشخاص</h1>
		</div>
		
		<nav class="navigation">
			{#each sections as section}
				<button
					class="nav-button {activeSection === section.id ? 'active' : ''}"
					on:click={() => scrollToSection(section.id)}
				>
					<span class="material-icons nav-icon">{section.icon}</span>
					<span class="nav-name">{section.name}</span>
				</button>
			{/each}
		</nav>
		
		<div class="navbar-controls">
			<div class="timeframe-selector">
				{#each timeframes as tf}
					<button
						class="timeframe-btn {timeframe === tf ? 'active' : ''}"
						on:click={() => timeframe = tf}
					>
						{tf === 'Hourly' ? 'ساعي' : tf === 'Daily' ? 'يومي' : tf === 'Weekly' ? 'أسبوعي' : 'شهري'}
					</button>
				{/each}
			</div>
			
			<button class="dark-mode-toggle" on:click={toggleDarkMode} title="تبديل الوضع المظلم">
				<span class="material-icons">
					{isDarkMode ? 'light_mode' : 'dark_mode'}
				</span>
			</button>
		</div>
	</header>

	<!-- Page Content -->
	<main class="page-content">
		<!-- Hero Section -->
		<section id="hero" class="hero-section">
			<div class="hero-content">
				<div class="hero-icon">
					<span class="material-icons">mosque</span>
				</div>
				<h1 class="hero-title">عداد زوار الحرم الشريف</h1>
				<p class="hero-subtitle">نظام متقدم لتتبع وإحصاء زوار الأماكن المقدسة بدقة وفعالية</p>
				<div class="hero-stats">
					<div class="stat-item">
						<span class="stat-number">1,500+</span>
						<span class="stat-label">زائر يومياً</span>
					</div>
					<div class="stat-item">
						<span class="stat-number">24/7</span>
						<span class="stat-label">مراقبة مستمرة</span>
					</div>
					<div class="stat-item">
						<span class="stat-number">99.9%</span>
						<span class="stat-label">دقة النظام</span>
					</div>
				</div>
			</div>
		</section>

		<!-- Live Counter Section -->
		<section id="live-counter" class="section">
			<div class="section-header">
				<h2 class="section-title">العداد المباشر</h2>
				<p class="section-subtitle">تتبع مباشر لأعداد الزوار في الوقت الفعلي</p>
			</div>
			<LiveCounter
				location={mainLocation}
				theme={displayTheme}
				timeframe={timeframe}
				showChart={true}
				showHover={true}
				smoothCurve={false}
				useSvg={false}
				cardSize="large"
			/>
		</section>

		<!-- Locations Section -->
		<section id="locations" class="section">
			<div class="section-header">
				<h2 class="section-title">مواقع متعددة</h2>
				<p class="section-subtitle">إدارة ومتابعة عدة مواقع من مكان واحد</p>
			</div>
			<LocationsDashboard {timeframe} />
		</section>

		<!-- Analytics Section -->
		<section id="analytics" class="section">
			<div class="section-header">
				<h2 class="section-title">لوحة تحكم التحليلات</h2>
				<p class="section-subtitle">تحليلات شاملة وتقارير مفصلة عن حركة الزوار</p>
			</div>
			<AnalyticsDashboard {timeframe} />
		</section>

		<!-- New Analytics Test Section -->
		<section id="new-analytics" class="section">
			<div class="section-header">
				<h2 class="section-title">اختبار النظام الجديد</h2>
				<p class="section-subtitle">اختبار شامل للنظام التحليلي الجديد مع البيانات المباشرة</p>
			</div>
			<NewAnalyticsTest />
		</section>

		<!-- Map Section -->
		<section id="map" class="section">
			<div class="section-header">
				<h2 class="section-title">الخريطة</h2>
				<p class="section-subtitle">عرض الخريطة للمواقع</p>
			</div>
			<Map on:mapmousemove={e => mouseCoords = e.detail.latlng} />
		</section>
	</main>
</div>

<style>
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(body) {
		font-family: 'Cairo', 'Inter', 'Segoe UI', 'Roboto', Arial, sans-serif;
		background: #f8f9fa;
		color: #2c3e50;
		direction: rtl;
		transition: background-color 0.3s ease, color 0.3s ease;
		/* min-height: 100vh; */
	}

	:global(.dark-mode body) {
		background: #1a202c;
		color: #e2e8f0;
	}

	.app {
		/* min-height: 100vh; */
		display: flex;
		flex-direction: column;
	}

	.navigation-header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(15px);
		border-bottom: 1px solid rgba(22, 160, 133, 0.2);
		padding: 15px 20px;
		z-index: 1000;
		display: flex;
		justify-content: space-between;
		align-items: center;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
		transition: background-color 0.3s ease, border-color 0.3s ease;
	}

	:global(.dark-mode) .navigation-header {
		background: rgba(26, 32, 44, 0.95);
		border-bottom: 1px solid rgba(22, 160, 133, 0.3);
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
	}

	.brand h1 {
		color: #16a085;
		font-size: 22px;
		font-weight: 700;
		margin: 0;
		font-family: 'Cairo', sans-serif;
	}

	.navigation {
		display: flex;
		gap: 8px;
	}

	.nav-button {
		display: flex;
		align-items: center;
		gap: 8px;
		background: #ffffff;
		border: 1px solid #e1e8ed;
		color: #7f8c8d;
		padding: 10px 16px;
		border-radius: 25px;
		cursor: pointer;
		font-size: 13px;
		font-weight: 500;
		font-family: 'Cairo', sans-serif;
		transition: all 0.3s ease;
	}

	:global(.dark-mode) .nav-button {
		background: #2d3748;
		border-color: #4a5568;
		color: #a0aec0;
	}

	.nav-button:hover {
		background: #f8f9fa;
		color: #16a085;
		border-color: #16a085;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(22, 160, 133, 0.15);
	}

	:global(.dark-mode) .nav-button:hover {
		background: #4a5568;
		color: #16a085;
		border-color: #16a085;
	}

	.nav-button.active {
		background: #16a085;
		color: #ffffff;
		border-color: #16a085;
		box-shadow: 0 2px 8px rgba(22, 160, 133, 0.3);
	}

	.nav-icon {
		font-size: 16px;
	}

	.navbar-controls {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.timeframe-selector {
		display: flex;
		gap: 4px;
		background: #ffffff;
		border-radius: 12px;
		padding: 4px;
		border: 1px solid #e1e8ed;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
		transition: all 0.3s ease;
	}

	:global(.dark-mode) .timeframe-selector {
		background: #2d3748;
		border-color: #4a5568;
	}

	.timeframe-btn {
		background: transparent;
		border: none;
		color: #7f8c8d;
		padding: 8px 12px;
		border-radius: 8px;
		cursor: pointer;
		font-size: 13px;
		font-weight: 500;
		font-family: 'Cairo', sans-serif;
		transition: all 0.3s ease;
		white-space: nowrap;
	}

	:global(.dark-mode) .timeframe-btn {
		color: #a0aec0;
	}

	.timeframe-btn:hover {
		color: #16a085;
		background: #f8f9fa;
	}

	:global(.dark-mode) .timeframe-btn:hover {
		background: #4a5568;
	}

	.timeframe-btn.active {
		background: #16a085;
		color: #ffffff;
		box-shadow: 0 2px 4px rgba(22, 160, 133, 0.2);
	}

	.dark-mode-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: #ffffff;
		border: 1px solid #e1e8ed;
		border-radius: 50%;
		cursor: pointer;
		transition: all 0.3s ease;
		color: #16a085;
	}

	:global(.dark-mode) .dark-mode-toggle {
		background: #2d3748;
		border-color: #4a5568;
		color: #1abc9c;
	}

	.dark-mode-toggle:hover {
		background: #f8f9fa;
		border-color: #16a085;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(22, 160, 133, 0.15);
	}

	:global(.dark-mode) .dark-mode-toggle:hover {
		background: #4a5568;
		border-color: #16a085;
	}

	.dark-mode-toggle .material-icons {
		font-size: 20px;
	}

	.page-content {
		flex: 1;
		padding-top: 80px;
		overflow-y: auto;
	}

	/* Hero Section Styles */
	.hero-section {
		min-height: 90vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
		position: relative;
		padding: 40px 20px;
		transition: background 0.3s ease;
	}

	:global(.dark-mode) .hero-section {
		background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
	}

	.hero-content {
		text-align: center;
		max-width: 800px;
		margin: 0 auto;
	}

	.hero-icon {
		margin-bottom: 30px;
	}

	.hero-icon .material-icons {
		font-size: 80px;
		color: #16a085;
		text-shadow: 0 4px 8px rgba(22, 160, 133, 0.3);
	}

	.hero-title {
		font-size: 48px;
		font-weight: 700;
		color: #2c3e50;
		margin-bottom: 20px;
		font-family: 'Cairo', sans-serif;
		line-height: 1.2;
		transition: color 0.3s ease;
	}

	:global(.dark-mode) .hero-title {
		color: #e2e8f0;
	}

	.hero-subtitle {
		font-size: 20px;
		color: #7f8c8d;
		margin-bottom: 50px;
		font-family: 'Cairo', sans-serif;
		line-height: 1.6;
		max-width: 600px;
		margin-left: auto;
		margin-right: auto;
		transition: color 0.3s ease;
	}

	:global(.dark-mode) .hero-subtitle {
		color: #a0aec0;
	}

	.hero-stats {
		display: flex;
		justify-content: center;
		gap: 60px;
		flex-wrap: wrap;
	}

	.stat-item {
		text-align: center;
	}

	.stat-number {
		display: block;
		font-size: 36px;
		font-weight: 700;
		color: #16a085;
		font-family: 'Cairo', sans-serif;
		margin-bottom: 8px;
	}

	.stat-label {
		font-size: 16px;
		color: #7f8c8d;
		font-family: 'Cairo', sans-serif;
		font-weight: 500;
		transition: color 0.3s ease;
	}

	:global(.dark-mode) .stat-label {
		color: #a0aec0;
	}

	/* Section Styles */
	.section {
		padding: 80px 20px;
		max-width: 1200px;
		margin: 0 auto;
	}

	.section-header {
		text-align: center;
		margin-bottom: 50px;
	}

	.section-title {
		font-size: 36px;
		font-weight: 700;
		color: #2c3e50;
		margin-bottom: 16px;
		font-family: 'Cairo', sans-serif;
		transition: color 0.3s ease;
	}

	:global(.dark-mode) .section-title {
		color: #e2e8f0;
	}

	.section-subtitle {
		font-size: 18px;
		color: #7f8c8d;
		font-family: 'Cairo', sans-serif;
		max-width: 500px;
		margin: 0 auto;
		line-height: 1.6;
		transition: color 0.3s ease;
	}

	:global(.dark-mode) .section-subtitle {
		color: #a0aec0;
	}

	/* Mobile Responsive */
	@media (max-width: 768px) {
		.brand h1 {
			font-size: 18px;
		}

		.nav-name {
			display: none;
		}
		
		.navigation {
			gap: 4px;
		}
		
		.nav-button {
			padding: 8px 12px;
			border-radius: 20px;
		}

		.hero-title {
			font-size: 32px;
		}

		.hero-subtitle {
			font-size: 16px;
			margin-bottom: 40px;
		}

		.hero-icon .material-icons {
			font-size: 60px;
		}

		.hero-stats {
			gap: 30px;
		}

		.stat-number {
			font-size: 28px;
		}

		.stat-label {
			font-size: 14px;
		}

		.section {
			padding: 60px 15px;
		}

		.section-title {
			font-size: 28px;
		}

		.section-subtitle {
			font-size: 16px;
		}

		.navbar-controls {
			order: 3;
			margin-top: 10px;
			gap: 8px;
		}

		.timeframe-selector {
			gap: 2px;
		}

		.dark-mode-toggle {
			width: 36px;
			height: 36px;
		}

		.dark-mode-toggle .material-icons {
			font-size: 18px;
		}

		.navigation-header {
			flex-wrap: wrap;
			padding: 12px 15px;
		}
	}

	/* Desktop Responsive */
	@media (min-width: 1024px) {
		.navigation-header {
			padding: 20px 40px;
		}
		
		.page-content {
			padding-top: 100px;
		}
	}
</style>