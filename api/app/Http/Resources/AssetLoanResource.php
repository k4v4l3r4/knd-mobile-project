<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssetLoanResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user' => $this->whenLoaded('user', function() {
                return [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                    'phone' => $this->user->phone,
                    'photo_url' => $this->user->photo_url,
                ];
            }),
            'asset_id' => $this->asset_id,
            'asset' => new AssetResource($this->whenLoaded('asset')),
            'quantity' => $this->quantity,
            'loan_date' => $this->loan_date,
            'return_date' => $this->return_date,
            'status' => $this->status,
            'admin_note' => $this->admin_note,
            'tenant_id' => $this->tenant_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
