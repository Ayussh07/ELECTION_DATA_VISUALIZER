/**
 * Main Application Component
 * 
 * This is the root React component for the Indian Election Data Visualization application.
 * It sets up routing and renders the main dashboard layout with all visualization components.
 * 
 * The application uses React Router for navigation and Tailwind CSS for styling.
 * All data visualization components are organized in a responsive grid layout.
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import KPICards from './components/KPICards';
import SeatShareChart from './components/SeatShareChart';
import GenderTrendChart from './components/GenderTrendChart';
import VoteShareChart from './components/VoteShareChart';
import MarginsTable from './components/MarginsTable';
import Analytics from './components/Analytics';

/**
 * Dashboard Component
 * 
 * Main dashboard view that displays all election data visualizations:
 * - KPI Cards: Key performance indicators (total seats, turnout, women candidates %)
 * - Seat Share Chart: Visual representation of seats won by each party
 * - Vote Share Chart: Visual representation of vote share by party
 * - Gender Trend Chart: Gender representation trends over time
 * - Margins Table: Table showing closest election contests
 * - Analytics: Advanced analytics and correlations
 * 
 * Layout is responsive: charts stack vertically on mobile, side-by-side on large screens.
 */
function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Key Performance Indicators - shows high-level statistics */}
      <KPICards />
      
      {/* Two-column grid for seat share and vote share charts on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SeatShareChart />
        <VoteShareChart />
      </div>
      
      {/* Gender trend chart - full width */}
      <GenderTrendChart />
      
      {/* Margins table - shows closest contests */}
      <MarginsTable />
      
      {/* Advanced analytics section */}
      <Analytics />
    </div>
  );
}

/**
 * Root App Component
 * 
 * Sets up React Router and provides the main application layout.
 * Currently has a single route for the dashboard, but can be extended
 * for additional pages (e.g., detailed constituency view, party comparison).
 */
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Header component with navigation and filters */}
        <Header />
        
        {/* Main content area with max-width constraint for readability */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            {/* Dashboard route - main page */}
            <Route path="/" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

