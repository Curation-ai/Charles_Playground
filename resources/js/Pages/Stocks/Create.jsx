import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import Layout from '@/Layouts/Layout';

export default function StockCreate() {
    const { data, setData, post, processing, errors } = useForm({
        ticker: '',
        name: '',
        date_mentioned: '',
        stock_type: '',
        data_source: '',
        mentioned_by: '',
    });

    const stockTypes = [
        'Technology',
        'Uranium',
        'Pharma',
        'Defence',
        'EV/Auto',
        'Fintech',
        'Mining',
        'Robotics',
        'Space',
        'Streaming',
        'Other',
    ];

    const dataSources = ['platform', 'chat_analysis', 'manual', 'import'];

    function handleSubmit(e) {
        e.preventDefault();
        post(route('stocks.store'));
    }

    return (
        <Layout>
            <Head title="Create Stock" />

            <div className="py-12">
                <div className="max-w-2xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <h1 className="text-3xl font-bold text-gray-800 mb-6">Add New Stock</h1>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Ticker */}
                                <div>
                                    <label htmlFor="ticker" className="block text-sm font-medium text-gray-700 mb-1">
                                        Ticker Symbol *
                                    </label>
                                    <input
                                        id="ticker"
                                        type="text"
                                        value={data.ticker}
                                        onChange={(e) => setData('ticker', e.target.value)}
                                        placeholder="e.g., AAPL"
                                        maxLength="10"
                                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            errors.ticker ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    />
                                    {errors.ticker && <p className="text-red-500 text-sm mt-1">{errors.ticker}</p>}
                                </div>

                                {/* Name */}
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                        Company Name *
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="e.g., Apple Inc."
                                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            errors.name ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    />
                                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                                </div>

                                {/* Date Mentioned */}
                                <div>
                                    <label htmlFor="date_mentioned" className="block text-sm font-medium text-gray-700 mb-1">
                                        Date Mentioned *
                                    </label>
                                    <input
                                        id="date_mentioned"
                                        type="date"
                                        value={data.date_mentioned}
                                        onChange={(e) => setData('date_mentioned', e.target.value)}
                                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            errors.date_mentioned ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    />
                                    {errors.date_mentioned && <p className="text-red-500 text-sm mt-1">{errors.date_mentioned}</p>}
                                </div>

                                {/* Stock Type */}
                                <div>
                                    <label htmlFor="stock_type" className="block text-sm font-medium text-gray-700 mb-1">
                                        Stock Type *
                                    </label>
                                    <select
                                        id="stock_type"
                                        value={data.stock_type}
                                        onChange={(e) => setData('stock_type', e.target.value)}
                                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            errors.stock_type ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    >
                                        <option value="">Select a type</option>
                                        {stockTypes.map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.stock_type && <p className="text-red-500 text-sm mt-1">{errors.stock_type}</p>}
                                </div>

                                {/* Data Source */}
                                <div>
                                    <label htmlFor="data_source" className="block text-sm font-medium text-gray-700 mb-1">
                                        Data Source *
                                    </label>
                                    <select
                                        id="data_source"
                                        value={data.data_source}
                                        onChange={(e) => setData('data_source', e.target.value)}
                                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            errors.data_source ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    >
                                        <option value="">Select a source</option>
                                        {dataSources.map((source) => (
                                            <option key={source} value={source}>
                                                {source}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.data_source && <p className="text-red-500 text-sm mt-1">{errors.data_source}</p>}
                                </div>

                                {/* Mentioned By */}
                                <div>
                                    <label htmlFor="mentioned_by" className="block text-sm font-medium text-gray-700 mb-1">
                                        Mentioned By *
                                    </label>
                                    <input
                                        id="mentioned_by"
                                        type="text"
                                        value={data.mentioned_by}
                                        onChange={(e) => setData('mentioned_by', e.target.value)}
                                        placeholder="e.g., user123, system"
                                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            errors.mentioned_by ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    />
                                    {errors.mentioned_by && <p className="text-red-500 text-sm mt-1">{errors.mentioned_by}</p>}
                                </div>

                                {/* Submit Button */}
                                <div className="flex gap-4 pt-6">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded"
                                    >
                                        {processing ? 'Creating...' : 'Create Stock'}
                                    </button>
                                    <a
                                        href={route('stocks.index')}
                                        className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded"
                                    >
                                        Cancel
                                    </a>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
