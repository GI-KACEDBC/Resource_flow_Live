<?php

namespace Tests\Unit;

use App\Models\Financial;
use App\Models\User;
use App\Policies\FinancialPolicy;
use Tests\TestCase;

/**
 * Verifies FinancialPolicy rules without HTTP (no DB).
 */
class FinancialPolicyTest extends TestCase
{
    public function test_recipient_can_view_own_financial_row(): void
    {
        $user = new User(['role' => 'requestor']);
        $user->id = 5;

        $financial = new Financial(['user_id' => 5]);
        $financial->id = 1;

        $policy = new FinancialPolicy;

        $this->assertTrue($policy->view($user, $financial));
    }

    public function test_recipient_cannot_view_another_users_financial_row(): void
    {
        $user = new User(['role' => 'requestor']);
        $user->id = 1;

        $financial = new Financial(['user_id' => 2]);

        $policy = new FinancialPolicy;

        $this->assertFalse($policy->view($user, $financial));
    }

    public function test_admin_cannot_view_another_users_financial_row(): void
    {
        $user = new User(['role' => 'admin']);
        $user->id = 1;

        $financial = new Financial(['user_id' => 999]);

        $policy = new FinancialPolicy;

        $this->assertFalse($policy->view($user, $financial));
    }

    public function test_super_admin_can_view_any_financial_row(): void
    {
        $user = new User(['role' => 'admin']);
        $user->id = 1;
        $user->email = 'superadmin@resourceflow.com';

        $financial = new Financial(['user_id' => 999]);

        $policy = new FinancialPolicy;

        $this->assertTrue($policy->view($user, $financial));
    }

    public function test_admin_can_view_statistics(): void
    {
        $user = new User(['role' => 'admin']);

        $policy = new FinancialPolicy;

        $this->assertTrue($policy->viewStatistics($user));
    }

    public function test_super_admin_can_view_statistics(): void
    {
        $user = new User(['role' => 'admin']);
        $user->email = 'superadmin@resourceflow.com';

        $policy = new FinancialPolicy;

        $this->assertTrue($policy->viewStatistics($user));
    }

    public function test_finance_role_cannot_view_statistics(): void
    {
        $user = new User(['role' => 'finance']);

        $policy = new FinancialPolicy;

        $this->assertFalse($policy->viewStatistics($user));
    }

    public function test_auditor_can_view_statistics(): void
    {
        $user = new User(['role' => User::ROLE_AUDITOR]);

        $policy = new FinancialPolicy;

        $this->assertTrue($policy->viewStatistics($user));
    }

    public function test_auditor_can_view_any_financial_row(): void
    {
        $user = new User(['role' => User::ROLE_AUDITOR]);
        $user->id = 1;

        $financial = new Financial(['user_id' => 999]);

        $policy = new FinancialPolicy;

        $this->assertTrue($policy->view($user, $financial));
    }

    public function test_auditor_cannot_update_financial_row(): void
    {
        $user = new User(['role' => User::ROLE_AUDITOR]);
        $user->id = 1;

        $financial = new Financial(['user_id' => 5]);

        $policy = new FinancialPolicy;

        $this->assertFalse($policy->update($user, $financial));
    }

    public function test_auditor_cannot_delete_financial_row(): void
    {
        $user = new User(['role' => User::ROLE_AUDITOR]);

        $financial = new Financial(['user_id' => 5]);

        $policy = new FinancialPolicy;

        $this->assertFalse($policy->delete($user, $financial));
    }

    public function test_donor_cannot_create_financial_records(): void
    {
        $user = new User(['role' => 'donor_individual']);

        $policy = new FinancialPolicy;

        $this->assertFalse($policy->create($user));
    }

    public function test_admin_can_create_financial_records(): void
    {
        $user = new User(['role' => 'admin']);

        $policy = new FinancialPolicy;

        $this->assertTrue($policy->create($user));
    }
}
