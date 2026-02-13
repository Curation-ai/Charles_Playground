<?php

use App\Http\Controllers\StockController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

// Welcome page
Route::get('/', fn () => Inertia::render('Welcome'))->name('welcome');

// Stock resource routes
Route::resource('stocks', StockController::class);
