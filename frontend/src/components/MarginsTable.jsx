import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getMargins } from '../services/api';

const MarginsTable = () => {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const year = searchParams.get('year');
    const state = searchParams.get('state');
    const district = searchParams.get('district');
    const constituency = searchParams.get('constituency');
    const yearNum = year ? parseInt(year) : null;
    // Only proceed if year is valid and within 1991-2019 range
    if (!year || !yearNum || isNaN(yearNum) || yearNum < 1991 || yearNum > 2019) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getMargins(year, state, 50, district, constituency)
      .then((response) => {
        // Handle both array format and { rows: [...] } format
        const data = Array.isArray(response.data) ? response.data : (response.data.rows || []);
        setData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching margins:', error);
        setLoading(false);
      });
  }, [searchParams.get('year'), searchParams.get('state'), searchParams.get('district'), searchParams.get('constituency')]); // Re-fetch when filters change

  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = data.slice(startIndex, endIndex);
  const totalPages = Math.ceil(data.length / itemsPerPage);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Narrowest Victories</h2>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Narrowest Victories</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">State</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Constituency</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Winner</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Runner-up</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Margin %</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.year}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.state_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.constituency_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="font-medium text-gray-900">{row.winner}</div>
                  <div className="text-gray-500">{row.winner_party}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="font-medium text-gray-900">{row.runner_up}</div>
                  <div className="text-gray-500">{row.runner_up_party}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                  {row.margin_percentage ? row.margin_percentage.toFixed(2) + '%' : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default MarginsTable;



