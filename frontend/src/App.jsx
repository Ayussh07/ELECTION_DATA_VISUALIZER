import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import KPICards from './components/KPICards';
import SeatShareChart from './components/SeatShareChart';
import GenderTrendChart from './components/GenderTrendChart';
import VoteShareChart from './components/VoteShareChart';
import MarginsTable from './components/MarginsTable';
import Analytics from './components/Analytics';

function Dashboard() {
  return (
    <div className="space-y-6">
      <KPICards />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SeatShareChart />
        <VoteShareChart />
      </div>
      
      <GenderTrendChart />
      
      <MarginsTable />
      
      <Analytics />
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

