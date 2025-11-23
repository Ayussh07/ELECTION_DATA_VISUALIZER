import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getYears, getStates, getParties } from '../services/api';

const Header = ({ onFilterChange }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [years, setYears] = useState([]);
  const [states, setStates] = useState([]);
  const [parties, setParties] = useState([]);
  useEffect(() => {
    // Load filter options
    Promise.all([getYears(), getStates(), getParties()])
      .then(([yearsRes, statesRes, partiesRes]) => {
        // getYears returns array directly, getStates/getParties return { rows: [...] }
        const allYears = Array.isArray(yearsRes.data) ? yearsRes.data : yearsRes.data.rows || [];
        // Filter years to 1991-2019 only
        const yearsList = allYears
          .filter(year => year >= 1991 && year <= 2019)
          .sort((a, b) => b - a);
        setYears(yearsList);
        setStates(Array.isArray(statesRes.data) ? statesRes.data : statesRes.data.rows || []);
        setParties(Array.isArray(partiesRes.data) ? partiesRes.data : partiesRes.data.rows || []);
        
        // Set default year to latest year (2019) if no year is selected
        if (!searchParams.get('year') && yearsList.length > 0) {
          const latestYear = yearsList[0]; // Years are sorted DESC, so first is latest (2019)
          const newParams = new URLSearchParams(searchParams);
          newParams.set('year', latestYear.toString());
          setSearchParams(newParams, { replace: true }); // Replace to avoid adding to history
        }
      })
      .catch((error) => {
        console.error('Error loading filter options:', error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleFilterChange = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
    onFilterChange?.(key, value);
  };

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Indian Election Data Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={searchParams.get('year') || ''}
              onChange={(e) => handleFilterChange('year', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Years</option>
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <select
              value={searchParams.get('state') || ''}
              onChange={(e) => handleFilterChange('state', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All States</option>
              {states.map((state) => (
                <option key={state.id} value={state.id}>{state.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Party</label>
            <select
              value={searchParams.get('party') || ''}
              onChange={(e) => handleFilterChange('party', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Parties</option>
              {parties.map((party) => (
                <option key={party.id} value={party.id}>{party.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={searchParams.get('gender') || ''}
              onChange={(e) => handleFilterChange('gender', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;



