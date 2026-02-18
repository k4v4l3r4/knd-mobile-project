<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Poll;
use App\Models\PollOption;
use App\Models\PollVote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class PollController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        
        $query = Poll::with(['options' => function ($query) {
            $query->withCount('votes');
        }])->withCount('votes');

        // Filter by RT if user has rt_id
        if ($user->rt_id) {
            $query->where('rt_id', $user->rt_id);
        }

        // Optional status filter
        if ($request->has('status')) {
            $query->where('status', $request->status);
        } else {
            // Default: hide DRAFT from listing (show only OPEN/CLOSED)
            $query->whereIn('status', ['OPEN', 'CLOSED']);
        }

        $polls = $query->latest()->get();

        $data = $polls->map(function ($poll) use ($user) {
            // Check if current user has voted
            $userVote = PollVote::where('poll_id', $poll->id)
                ->where('user_id', $user->id)
                ->first();

            // Calculate percentages
            $totalVotes = $poll->votes_count;
            $options = $poll->options->map(function ($option) use ($totalVotes) {
                $percentage = $totalVotes > 0 ? ($option->votes_count / $totalVotes) * 100 : 0;
                return [
                    'id' => $option->id,
                    'name' => $option->name,
                    'description' => $option->description,
                    'image_url' => $option->image_url,
                    'vote_count' => $option->votes_count, // From withCount or column? Schema has vote_count column. 
                                                          // Let's use the column for persistence/caching or count relation. 
                                                          // Using relation count is safer for consistency, but if we increment column we can use that.
                                                          // I'll use the relation count for accuracy here.
                    'percentage' => round($percentage, 1)
                ];
            });

            return [
                'id' => $poll->id,
                'rt_id' => $poll->rt_id,
                'title' => $poll->title,
                'description' => $poll->description,
                'start_date' => $poll->start_date->format('Y-m-d'),
                'end_date' => $poll->end_date->format('Y-m-d'),
                'status' => $poll->status,
                'is_voted' => $userVote ? true : false,
                'voted_option_id' => $userVote ? $userVote->poll_option_id : null,
                'total_votes' => $totalVotes,
                'options' => $options
            ];
        });

        return response()->json(['data' => $data]);
    }

    public function show($id)
    {
        $poll = Poll::with(['options' => function ($query) {
            $query->withCount('votes');
        }])->withCount('votes')->findOrFail($id);

        $user = request()->user();
        $userVote = PollVote::where('poll_id', $poll->id)
                ->where('user_id', $user->id)
                ->first();

        $totalVotes = $poll->votes_count;
        $options = $poll->options->map(function ($option) use ($totalVotes) {
            $percentage = $totalVotes > 0 ? ($option->votes_count / $totalVotes) * 100 : 0;
            return [
                'id' => $option->id,
                'name' => $option->name,
                'description' => $option->description,
                'image_url' => $option->image_url,
                'vote_count' => $option->votes_count,
                'percentage' => round($percentage, 1)
            ];
        });

        return response()->json([
            'data' => [
                'id' => $poll->id,
                'rt_id' => $poll->rt_id,
                'title' => $poll->title,
                'description' => $poll->description,
                'start_date' => $poll->start_date->format('Y-m-d'),
                'end_date' => $poll->end_date->format('Y-m-d'),
                'status' => $poll->status,
                'is_voted' => $userVote ? true : false,
                'voted_option_id' => $userVote ? $userVote->poll_option_id : null,
                'total_votes' => $totalVotes,
                'options' => $options
            ]
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'options' => 'required|array|min:2',
            'options.*.name' => 'required|string',
            // Image validation if needed
        ]);

        $user = $request->user();
        $role = strtoupper((string) $user->role);

        // Only RT/Admin roles are allowed to create polls
        if (!in_array($role, ['RT', 'ADMIN_RT', 'RW', 'ADMIN_RW', 'SUPER_ADMIN', 'SEKRETARIS_RT', 'BENDAHARA_RT'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Allow Admin RT or Super Admin. If Admin RT, use their rt_id.
        $rtId = $user->rt_id; 
        if (!$rtId && $request->rt_id) {
             // For super admin specifying RT
             $rtId = $request->rt_id;
        }
        
        if (!$rtId) {
             return response()->json(['message' => 'RT ID is required'], 400);
        }

        try {
            DB::beginTransaction();

            $poll = Poll::create([
                'rt_id' => $rtId,
                'title' => $request->title,
                'description' => $request->description,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'status' => $request->status ?? 'DRAFT'
            ]);

            foreach ($request->options as $opt) {
                // Handle image upload if present (assuming base64 or file handling in separate endpoint, 
                // but for simplicity let's assume URL or just store text if no image logic provided yet.
                // Or if it's a file upload in this request, we need multipart/form-data handling.
                // Let's assume the frontend sends 'image_url' string or we handle file upload separately.
                // For now, simple text fields.
                
                PollOption::create([
                    'poll_id' => $poll->id,
                    'name' => $opt['name'],
                    'description' => $opt['description'] ?? null,
                    'image_url' => $opt['image_url'] ?? null
                ]);
            }

            DB::commit();
            return response()->json(['message' => 'Polling created successfully', 'data' => $poll], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create poll', 'error' => $e->getMessage()], 500);
        }
    }

    public function vote(Request $request, $id)
    {
        $request->validate([
            'poll_option_id' => 'required_without:option_id|exists:poll_options,id',
            'option_id' => 'required_without:poll_option_id|exists:poll_options,id',
        ]);

        $poll = Poll::findOrFail($id);
        $user = $request->user();

        // Validation 1: Check Status
        if ($poll->status !== 'OPEN') {
            return response()->json(['message' => 'Voting is not open'], 400);
        }

        // Validation 2: Check Date Range
        $now = now();
        if ($now->lt($poll->start_date) || $now->gt($poll->end_date->endOfDay())) {
             return response()->json(['message' => 'Voting period is not active'], 400);
        }

        // Validation 3: Check RT (Warga must be in same RT)
        if ($user->rt_id && $user->rt_id != $poll->rt_id) {
            return response()->json(['message' => 'You are not authorized to vote in this poll'], 403);
        }

        // Validation 4: Check Double Vote
        $existingVote = PollVote::where('poll_id', $id)
            ->where('user_id', $user->id)
            ->exists();

        if ($existingVote) {
            return response()->json(['message' => 'You have already voted'], 400);
        }

        // Normalize option ID for backward compatibility (mobile uses option_id)
        $optionId = $request->poll_option_id ?? $request->option_id;

        try {
            DB::beginTransaction();

            // Record Vote
            PollVote::create([
                'poll_id' => $id,
                'user_id' => $user->id,
                'poll_option_id' => $optionId
            ]);

            // Increment Count
            $option = PollOption::find($optionId);
            $option->increment('vote_count');

            DB::commit();
            return response()->json(['message' => 'Vote recorded successfully']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to record vote', 'error' => $e->getMessage()], 500);
        }
    }
}
