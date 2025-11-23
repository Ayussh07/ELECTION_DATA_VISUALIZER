import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getSeatShare } from '../services/api';

const SeatShareChart = () => {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const year = searchParams.get('year');
    const state = searchParams.get('state');
    const party = searchParams.get('party');
    const gender = searchParams.get('gender');
    const district = searchParams.get('district');
    const constituency = searchParams.get('constituency');
    const yearNum = year ? parseInt(year) : null;
    // Only proceed if year is valid and within 1991-2019 range
    if (!year || !yearNum || isNaN(yearNum) || yearNum < 1991 || yearNum > 2019) {
      // Wait for valid year to be set by Header component
      return;
    }
    console.log('SeatShareChart: Fetching data for year:', year, 'state:', state, 'district:', district, 'constituency:', constituency, 'party:', party, 'gender:', gender);
    setLoading(true);
    getSeatShare(year, state, party, gender, district, constituency)
      .then((response) => {
        // Handle both array format and { rows: [...] } format
        const data = Array.isArray(response.data) ? response.data : (response.data.rows || []);
        console.log('SeatShareChart: Received data for year', year, 'state', state, 'district', district, 'party', party, 'gender', gender, ':', data.length, 'parties');
        setData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching seat share:', error);
        setLoading(false);
      });
  }, [searchParams.get('year'), searchParams.get('state'), searchParams.get('district'), searchParams.get('constituency'), searchParams.get('party'), searchParams.get('gender')]); // Re-fetch when filters change

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Seat Share by Party</h2>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Seat Share by Party</h2>
      {data.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="party" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="seats" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Winners by Party and District:</h3>
            {data.map((item, idx) => (
              <div key={idx} className="border-l-2 border-blue-300 pl-3">
                <div className="text-sm font-medium text-gray-800 mb-1">
                  {item.party}: <span className="text-blue-600">{item.seats} seat{item.seats !== 1 ? 's' : ''}</span>
                </div>
                {item.winnersByDistrict && item.winnersByDistrict.length > 0 ? (
                  <div className="ml-4 mt-2 space-y-1">
                    {item.winnersByDistrict.map((district, dIdx) => (
                      <div key={dIdx} className="text-xs text-gray-600">
                        <span className="font-semibold text-gray-700">{district.district}:</span>{' '}
                        {district.winners.map((winner, wIdx) => (
                          <span key={wIdx}>
                            {winner}
                            {wIdx < district.winners.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : item.winners ? (
                  <div className="ml-4 mt-1 text-xs text-gray-500">
                    {typeof item.winners === 'string' ? item.winners : 'No winners data'}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data available
        </div>
      )}
    </div>
  );
};

export default SeatShareChart;



