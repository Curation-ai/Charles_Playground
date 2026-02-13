import { Head, Link } from '@inertiajs/react';
import Layout from '@/Layouts/Layout';

export default function Welcome() {
    return (
        <Layout>
            <Head title="Welcome" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900 text-center">
                            <h1 className="text-4xl font-bold mb-4">Welcome to Stock Database</h1>
                            <p className="text-xl text-gray-600 mb-8">
                                Manage and organize your stock data with ease
                            </p>
                            <Link
                                href={route('stocks.index')}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
                            >
                                View Stocks
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
