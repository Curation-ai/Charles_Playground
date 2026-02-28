<?php

declare(strict_types=1);

use App\Models\Member;

it('lists members with pagination', function () {
    Member::factory()->count(3)->create();

    $response = $this->getJson('/api/v1/members');

    $response->assertOk()
        ->assertJsonStructure(['data', 'meta', 'links']);
});

it('shows a single member', function () {
    $member = Member::factory()->create();

    $response = $this->getJson("/api/v1/members/{$member->id}");

    $response->assertOk()
        ->assertJsonFragment(['name' => $member->name]);
});

it('creates a member with valid data', function () {
    $response = $this->postJson('/api/v1/members', [
        'name' => 'Jane Smith',
        'email' => 'jane@example.com',
    ]);

    $response->assertCreated()
        ->assertJsonFragment(['name' => 'Jane Smith']);

    $this->assertDatabaseHas('members', ['email' => 'jane@example.com']);
});

it('rejects a duplicate email', function () {
    Member::factory()->create(['email' => 'taken@example.com']);

    $response = $this->postJson('/api/v1/members', [
        'name' => 'Another Person',
        'email' => 'taken@example.com',
    ]);

    $response->assertUnprocessable();
});

it('updates a member', function () {
    $member = Member::factory()->create(['name' => 'Old Name']);

    $response = $this->patchJson("/api/v1/members/{$member->id}", ['name' => 'New Name']);

    $response->assertOk()
        ->assertJsonFragment(['name' => 'New Name']);
});

it('deletes a member', function () {
    $member = Member::factory()->create();

    $this->deleteJson("/api/v1/members/{$member->id}")->assertNoContent();

    $this->assertDatabaseMissing('members', ['id' => $member->id]);
});

it('returns name required validation error on store', function () {
    $response = $this->postJson('/api/v1/members', []);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['name']);
});
