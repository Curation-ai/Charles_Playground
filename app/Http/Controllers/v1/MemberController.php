<?php

declare(strict_types=1);

namespace App\Http\Controllers\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\GenerateMemberEmbeddingsRequest;
use App\Http\Resources\MemberResource;
use App\Models\Member;
use App\Services\MemberService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class MemberController extends Controller
{
    public function __construct(private MemberService $memberService) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Member::with('originatedStocks', 'commentedStocks');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                    ->orWhere('company', 'LIKE', "%{$search}%")
                    ->orWhere('job_title', 'LIKE', "%{$search}%");
            });
        }

        return MemberResource::collection($query->orderBy('name')->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateMemberRequest($request);

        $member = Member::create($validated);

        if (! empty($validated['originated_links'])) {
            $this->memberService->syncOriginatedStocks($member, $validated['originated_links']);
        }

        if (! empty($validated['commented_links'])) {
            $this->memberService->syncCommentedStocks($member, $validated['commented_links']);
        }

        $this->memberService->generateEmbedding($member);

        return (new MemberResource($member->fresh()->load('originatedStocks', 'commentedStocks')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Member $member): MemberResource
    {
        return new MemberResource($member->load('originatedStocks', 'commentedStocks'));
    }

    public function update(Request $request, Member $member): MemberResource
    {
        $validated = $this->validateMemberRequest($request, $member->id);

        $member->update($validated);

        if (array_key_exists('originated_links', $validated)) {
            $this->memberService->syncOriginatedStocks($member, $validated['originated_links'] ?? []);
        }

        if (array_key_exists('commented_links', $validated)) {
            $this->memberService->syncCommentedStocks($member, $validated['commented_links'] ?? []);
        }

        $this->memberService->generateEmbedding($member->fresh());

        return new MemberResource($member->fresh()->load('originatedStocks', 'commentedStocks'));
    }

    public function destroy(Member $member): JsonResponse
    {
        $member->delete();

        return response()->json(null, 204);
    }

    public function generateEmbeddings(GenerateMemberEmbeddingsRequest $request): JsonResponse
    {
        $query = Member::query();

        if ($request->filled('member_ids')) {
            $query->whereIn('id', $request->input('member_ids'));
        } else {
            $query->whereNull('embedding');
        }

        $members = $query->get();
        $processed = 0;

        foreach ($members as $member) {
            $text = $member->getEmbeddingText();

            if (! trim($text)) {
                continue;
            }

            $this->memberService->generateEmbedding($member);
            $processed++;
            usleep(250_000);
        }

        return response()->json(['status' => 'complete', 'processed' => $processed]);
    }

    private function validateMemberRequest(Request $request, ?int $ignoreId = null): array
    {
        $emailRule = $ignoreId
            ? ['nullable', 'email', 'max:255', Rule::unique('members', 'email')->ignore($ignoreId)]
            : ['nullable', 'email', 'max:255', 'unique:members,email'];

        return $request->validate([
            'name' => $ignoreId ? 'sometimes|required|string|max:255' : 'required|string|max:255',
            'email' => $emailRule,
            'phone' => 'nullable|string|max:50',
            'linkedin_url' => 'nullable|url|max:500',
            'twitter_handle' => 'nullable|string|max:100',
            'company' => 'nullable|string|max:255',
            'job_title' => 'nullable|string|max:255',
            'bio' => 'nullable|string',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:100',
            'notes' => 'nullable|string',
            'investor_type' => 'nullable|string|max:100',
            'investment_focus' => 'nullable|array',
            'investment_focus.*' => 'string|max:100',
            'location' => 'nullable|string|max:255',
            'last_contact_date' => 'nullable|date',
            'is_active' => 'nullable|boolean',
            'originated_links' => 'nullable|array',
            'originated_links.*.stock_id' => 'required|integer|exists:stocks,id',
            'originated_links.*.note' => 'nullable|string|max:255',
            'commented_links' => 'nullable|array',
            'commented_links.*.stock_id' => 'required|integer|exists:stocks,id',
            'commented_links.*.note' => 'nullable|string|max:255',
        ]);
    }
}
