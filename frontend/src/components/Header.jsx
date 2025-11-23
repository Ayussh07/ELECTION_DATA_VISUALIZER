import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getYears, getStates, getParties, getConstituencies, getConstituenciesList } from '../services/api';

const Header = ({ onFilterChange }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [years, setYears] = useState([]);
  const [states, setStates] = useState([]);
  const [parties, setParties] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [constituencies, setConstituencies] = useState([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingConstituencies, setLoadingConstituencies] = useState(false);
  
  useEffect(() => {
    // Load filter options
    Promise.all([getYears(), getStates(), getParties()])
      .then(([yearsRes, statesRes, partiesRes]) => {
        // getYears returns array directly, getStates/getParties return array directly
        const allYears = Array.isArray(yearsRes.data) ? yearsRes.data : yearsRes.data.rows || [];
        // Filter to only show years from 1991 to 2019
        const yearsList = allYears
          .filter(year => year != null && !isNaN(year) && year >= 1991 && year <= 2019)
          .sort((a, b) => b - a);
        setYears(yearsList);
        
        // States and parties are returned as arrays directly from backend
        const statesData = Array.isArray(statesRes.data) ? statesRes.data : (statesRes.data?.rows || []);
        const partiesData = Array.isArray(partiesRes.data) ? partiesRes.data : (partiesRes.data?.rows || []);
        setStates(statesData);
        setParties(partiesData);
        
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

  // Load districts when state changes
  useEffect(() => {
    const selectedState = searchParams.get('state');
    if (selectedState) {
      setLoadingDistricts(true);
      getConstituencies(selectedState)
        .then((response) => {
          const districtsData = Array.isArray(response.data) ? response.data : (response.data?.rows || []);
          setDistricts(districtsData);
          setLoadingDistricts(false);
        })
        .catch((error) => {
          console.error('Error loading districts:', error);
          setDistricts([]);
          setLoadingDistricts(false);
        });
    } else {
      setDistricts([]);
      // Clear district and constituency filters if no state is selected
      if (searchParams.get('district') || searchParams.get('constituency')) {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('district');
        newParams.delete('constituency');
        setSearchParams(newParams);
      }
    }
  }, [searchParams.get('state'), searchParams, setSearchParams]);

  // Load constituencies when state or district changes
  useEffect(() => {
    const selectedState = searchParams.get('state');
    const selectedDistrict = searchParams.get('district');
    if (selectedState) {
      setLoadingConstituencies(true);
      getConstituenciesList(selectedState, selectedDistrict)
        .then((response) => {
          const constituenciesData = Array.isArray(response.data) ? response.data : (response.data?.rows || []);
          setConstituencies(constituenciesData);
          setLoadingConstituencies(false);
        })
        .catch((error) => {
          console.error('Error loading constituencies:', error);
          setConstituencies([]);
          setLoadingConstituencies(false);
        });
    } else {
      setConstituencies([]);
      // Clear constituency filter if no state is selected
      if (searchParams.get('constituency')) {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('constituency');
        setSearchParams(newParams);
      }
    }
  }, [searchParams.get('state'), searchParams.get('district'), searchParams, setSearchParams]);

  const handleFilterChange = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // If state is cleared, also clear district and constituency
    if (key === 'state' && !value) {
      newParams.delete('district');
      newParams.delete('constituency');
    }
    // Note: We don't clear constituency when district is cleared, as constituency can be selected independently
    setSearchParams(newParams);
    onFilterChange?.(key, value);
  };

  const handleClearAll = () => {
    const newParams = new URLSearchParams();
    // Keep only the year if it exists, or set to latest year
    if (years.length > 0) {
      newParams.set('year', years[0].toString());
    }
    setSearchParams(newParams);
    onFilterChange?.('clear', 'all');
  };

  const selectedState = searchParams.get('state');
  const selectedDistrict = searchParams.get('district');

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Indian Election Data Dashboard</h1>
          <button
            onClick={handleClearAll}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 text-sm"
            title="Clear all filters"
          >
            Clear All Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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

          {selectedState && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
              <select
                value={searchParams.get('district') || ''}
                onChange={(e) => handleFilterChange('district', e.target.value)}
                disabled={loadingDistricts}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">All Districts</option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>{district.name}</option>
                ))}
              </select>
            </div>
          )}

          {selectedState && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Constituency</label>
                {searchParams.get('constituency') && (
                  <button
                    onClick={() => handleFilterChange('constituency', '')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    title="Clear constituency filter"
                  >
                    Clear
                  </button>
                )}
              </div>
              <select
                value={searchParams.get('constituency') || ''}
                onChange={(e) => handleFilterChange('constituency', e.target.value)}
                disabled={loadingConstituencies}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">All Constituencies</option>
                {constituencies.map((constituency) => (
                  <option key={constituency.id} value={constituency.id}>
                    {constituency.name}
                    {constituency.constituency_no ? ` (${constituency.constituency_no})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

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
