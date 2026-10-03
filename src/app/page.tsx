'use client';

import React, { useState, useEffect } from 'react';
import Navbar, { TabKey } from '@/components/Navbar';
import AboutSection from '@/components/AboutSection';
import ExperienceSection from '@/components/ExperienceSection';
import TechStack from '@/components/TechStack';
import MiniErpShowcase from '@/components/MiniErpShowcase';
import FeaturedProjects from '@/components/FeaturedProjects';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Sync hash on mount and hashchange
  useEffect(() => {
    const handleHashSync = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (['overview', 'experience', 'skills', 'projects', 'contact'].includes(hash)) {
        setActiveTab(hash as TabKey);
      }
    };

    handleHashSync();
    window.addEventListener('hashchange', handleHashSync);
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, []);

  const handleSelectTab = (tab: TabKey) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `#${tab}`);
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Clean Technical Navigation Header */}
      <Navbar activeTab={activeTab} onSelectTab={handleSelectTab} />

      {/* Main Tab Content Area */}
      <div style={{ flex: 1, paddingTop: '24px' }}>
        {/* TAB 1: TỔNG QUAN (Giới thiệu bản thân) */}
        {activeTab === 'overview' && (
          <div className="tab-fade-in">
            <AboutSection onSelectTab={handleSelectTab} />
          </div>
        )}

        {/* TAB 2: KINH NGHIỆM (Kinh nghiệm thực chiến) */}
        {activeTab === 'experience' && (
          <div className="tab-fade-in">
            <ExperienceSection />
          </div>
        )}

        {/* TAB 3: KỸ NĂNG (Công nghệ & kỹ thuật) */}
        {activeTab === 'skills' && (
          <div className="tab-fade-in">
            <TechStack />
          </div>
        )}

        {/* TAB 4: DỰ ÁN (Demo Mini ERP & Case Studies) */}
        {activeTab === 'projects' && (
          <div className="tab-fade-in">
            <MiniErpShowcase />
            <FeaturedProjects />
          </div>
        )}

        {/* TAB 5: LIÊN HỆ (Kênh trao đổi & thông tin liên lạc) */}
        {activeTab === 'contact' && (
          <div className="tab-fade-in">
            <ContactSection />
          </div>
        )}
      </div>

      {/* Clean Technical Footer */}
      <Footer onSelectTab={handleSelectTab} />
    </main>
  );
}
