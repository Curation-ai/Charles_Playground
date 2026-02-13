import { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/Layouts/Layout';

export default function StockIndex({ stocks }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredStocks, setFilteredStocks] = useState(stocks);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredStocks(stocks);
        } else {
            setFilteredStocks(
                stocks.filter(
                    (stock) =>
                        stock.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        stock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        stock.stock_type.toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }
    }, [searchTerm, stocks]);

    return (
        <Layout>
            <Head title="Stocks" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <div className="flex justify-between items-center mb-6">
                                <h1 className="text-3xl font-bold text-gray-800">Stocks</h1>
                                <Link
                                    href={route('stocks.create')}
                                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                                >
                                    Add Stock
                                </Link>
                            </div>

                            {/* Search Bar */}
                            <div className="mb-6">
                                <input
                                    type="text"
                                    placeholder="Search by ticker, name, or type..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Stocks Table */}
                            {filteredStocks.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Ticker
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Name
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Type
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Source
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Date Mentioned
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredStocks.map((stock) => (
                                                <tr key={stock.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {stock.ticker}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {stock.name}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                            {stock.stock_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {stock.data_source}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {new Date(stock.date_mentioned).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <Link
                                                            href={route('stocks.show', stock.id)}
                                                            className="text-blue-600 hover:text-blue-900 mr-3"
                                                        >
                                                            View
                                                        </Link>
                                                        <Link
                                                            href={route('stocks.edit', stock.id)}
                                                            className="text-blue-600 hover:text-blue-900 mr-3"
                                                        >
                                                            Edit
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No stocks found. {searchTerm && 'Try a different search.'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
