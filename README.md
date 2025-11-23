# Indian Election Data Visualization

A full-stack MERN application for visualizing Indian election data with interactive charts, maps, and analytics.

## Tech Stack

- **Backend**: Node.js + Express.js + PostgreSQL
- **Frontend**: React + Vite + Tailwind CSS
- **Visualization**: Recharts, React Simple Maps
- **Database**: PostgreSQL

## Project Structure

```
varahe/
├── backend/
│   ├── database/
│   │   ├── schema.sql          # Database schema
│   │   └── connection.js        # PostgreSQL connection pool
│   ├── routes/
│   │   └── elections.js         # API routes
│   ├── scripts/
│   │   └── importData.js        # CSV import script
│   ├── server.js                # Express server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── services/            # API service layer
│   │   └── App.jsx
│   └── package.json
├── cleaned_election_data.csv    # Main dataset
└── cleaned_sample.csv           # Sample dataset for testing
```

## Prerequisites

- Node.js (v20 or higher)
- PostgreSQL (v15 or higher)
- npm or yarn

## Setup Instructions

### 1. Database Setup

1. Install PostgreSQL if not already installed
2. Create a database:
   ```sql
   CREATE DATABASE election_data;
   ```

3. Run the schema script:
   ```bash
   psql -U postgres -d election_data -f backend/database/schema.sql
   ```

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=election_data
   DB_USER=postgres
   DB_PASSWORD=your_password
   PORT=5000
   ```

4. Import the CSV data:
   ```bash
   node scripts/importData.js ../cleaned_election_data.csv
   ```
   
   Note: This may take several minutes depending on the size of your CSV file.

5. Start the backend server:
   ```bash
   npm run dev
   ```
   
   The API will be available at `http://localhost:5000`

### 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the frontend directory (optional):
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```
   
   The frontend will be available at `http://localhost:5173`

## API Endpoints

See [API_CONTRACT.md](./API_CONTRACT.md) for detailed API documentation.

### Quick Reference

- `GET /api/years` - Get all available years
- `GET /api/states` - Get all states
- `GET /api/parties` - Get all parties
- `GET /api/elections` - Get election results with filters
- `GET /api/seat-share?year=` - Get seat share by party
- `GET /api/turnout?year=` - Get turnout by state
- `GET /api/vote-share?year=&party=` - Get vote share statistics
- `GET /api/gender-trend?party=&state=` - Get gender representation trends
- `GET /api/margins?year=&state=&limit=` - Get narrowest victories
- `GET /api/search?q=&type=` - Search candidates, constituencies, or parties
- `GET /api/kpis?year=` - Get key performance indicators
- `GET /api/analytics/*` - Various analytics endpoints

## Features

### Dashboard Components

1. **KPI Cards**: Total seats, overall turnout, women candidates percentage
2. **Seat Share Chart**: Bar chart showing seats won by each party
3. **Turnout Map**: Choropleth map of India colored by turnout percentage
4. **Gender Trend Chart**: Line chart showing gender representation over years
5. **Vote Share Chart**: Pie chart of top parties
6. **Margins Table**: Table of narrowest election victories with pagination

### Filters

- Year selector
- State filter
- Party filter
- Gender filter
- Search functionality

All filters are persisted in the URL for easy sharing and bookmarking.

## Data Schema

The database uses a normalized relational schema:

- **states**: State information
- **parties**: Political parties
- **constituencies**: Electoral constituencies
- **elections**: Election metadata (year, type, etc.)
- **candidates**: Candidate information
- **results**: Main fact table with election results

See `backend/database/schema.sql` for complete schema definition.

## CSV Column Documentation

The cleaned_election_data.csv contains the following key columns:

- `state_name`: Name of the state
- `constituency_name`: Name of the constituency
- `year`: Election year
- `candidate`: Candidate name
- `sex`: Gender (M/F)
- `party`: Party name
- `votes`: Number of votes received
- `vote_share_percentage`: Percentage of votes
- `turnout_percentage`: Voter turnout percentage
- `margin_percentage`: Victory margin percentage
- `position`: Candidate's position (1 = winner)

## Development

### Backend Development

```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
```

### Frontend Development

```bash
cd frontend
npm run dev  # Vite dev server with hot reload
```

### Running Tests

```bash
cd backend
npm test
```

## Production Build

### Backend

```bash
cd backend
npm start
```

### Frontend

```bash
cd frontend
npm run build
npm run preview  # Preview production build
```

## Troubleshooting

### Database Connection Issues

- Ensure PostgreSQL is running
- Check `.env` file has correct credentials
- Verify database exists: `psql -U postgres -l`

### CSV Import Issues

- Ensure CSV file path is correct
- Check CSV file encoding (should be UTF-8)
- Verify database schema is created first
- Check for duplicate entries in the database

### API Not Responding

- Verify backend server is running on port 5000
- Check CORS settings if accessing from different origin
- Review server logs for errors

## Limitations

1. The map visualization uses a simplified TopoJSON file. For production, use official India state boundaries.
2. Large datasets may require pagination optimization
3. Some CSV columns with 'inf' values are handled as NULL in the database
4. State name normalization may need adjustment for map matching

## Future Enhancements

- [ ] Add more detailed candidate profiles
- [ ] Implement constituency detail pages
- [ ] Add export functionality for charts
- [ ] Implement advanced filtering options
- [ ] Add time-series analysis
- [ ] Create comparison views between elections

## License

ISC

## Contact

For issues or questions, please open an issue in the repository.


