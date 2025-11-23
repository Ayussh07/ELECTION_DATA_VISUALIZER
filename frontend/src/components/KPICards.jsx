import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getKPIs } from '../services/api';

const KPICards = () => {
  const [searchParams] = useSearchParams();
  const [kpis, setKpis] = useState({ total_seats: 0, overall_turnout: 0, women_candidates_pct: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const year = searchParams.get('year');
    const state = searchParams.get('state');
    const gender = searchParams.get('gender');
    const district = searchParams.get('district');
    const constituency = searchParams.get('constituency');
    const yearNum = year ? parseInt(year) : null;
    // Only proceed if year is valid and within 1991-2019 range
    if (!year || !yearNum || isNaN(yearNum) || yearNum < 1991 || yearNum > 2019) {
      // Wait for valid year to be set by Header component
      return;
    }
    console.log('KPICards: Fetching data for year:', year, 'state:', state, 'district:', district, 'constituency:', constituency, 'gender:', gender);
    setLoading(true);
    getKPIs(year, state, gender, district, constituency)
      .then((response) => {
        console.log('KPICards: Received data for year', year, 'state', state, 'gender', gender, ':', response.data);
        setKpis(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching KPIs:', error);
        setLoading(false);
      });
  }, [searchParams.get('year'), searchParams.get('state'), searchParams.get('district'), searchParams.get('constituency'), searchParams.get('gender')]); // Re-fetch when filters change

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Total Seats</h3>
        <p className="text-3xl font-bold text-gray-900">{kpis.total_seats.toLocaleString()}</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Overall Turnout</h3>
        <p className="text-3xl font-bold text-gray-900">{kpis.overall_turnout.toFixed(2)}%</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Women Candidates</h3>
        <p className="text-3xl font-bold text-gray-900">{kpis.women_candidates_pct.toFixed(2)}%</p>
      </div>
    </div>
  );
};

export default KPICards;



