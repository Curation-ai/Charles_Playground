import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/Layouts/Layout';

export default function StockShow({ stock }) {
    const { delete: destroy, processing } = useForm();

    function handleDelete() {
        if (confirm('Are you sure you want to delete this stock?')) {
            destroy(route('stocks.destroy', stock.id));
        }
    }

    return (
        <Layout>
            <Head title={`${stock.ticker} - Stock Details`} />

            <div className="py-12">
                <div className="max-w-2xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <h1 className="text-3xl font-bold text-gray-800 mb-6">{stock.ticker}</h1>

                            <div className="space-y-6">
                                {/* Stock Information */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Company Name</label>
                                        <p className="text-lg text-gray-900">{stock.name}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Stock Type</label>
                                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                                            {stock.stock_type}
                                        </span>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Date Mentioned</label>
                                        <p className="text-lg text-gray-900">{stock.date_mentioned}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Data Source</label>
                                        <p className="text-lg text-gray-900">{stock.data_source}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Mentioned By</label>
                                        <p className="text-lg text-gray-900">{stock.mentioned_by}</p>
                                    </div>
                                </div>

                                {/* Timestamps */}
                                <div className="border-t border-gray-200 pt-6">
                                    <div className="grid grid-cols-2 gap-6 text-sm text-gray-600">
                                        <div>
                                            <label className="block font-medium mb-1">Created</label>
                                            <p>{stock.created_at}</p>
                                        </div>
                                        <div>
                                            <label className="block font-medium mb-1">Last Updated</label>
                                            <p>{stock.updated_at}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-4 pt-6 border-t border-gray-200">
                                    <Link
                                        href={route('stocks.edit', stock.id)}
                                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
                                    >
                                        Edit Stock
                                    </Link>
                                    <button
                                        onClick={handleDelete}
                                        disabled={processing}
                                        className="bg-red-500 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded"
                                    >
                                        {processing ? 'Deleting...' : 'Delete Stock'}
                                    </button>
                                    <Link
                                        href={route('stocks.index')}
                                        className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded"
                                    >
                                        Back to Stocks
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
