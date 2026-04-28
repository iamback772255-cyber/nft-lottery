#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, token, Address, Env, String};

fn create_token_contract<'a>(
    e: &Env,
) -> (Address, token::Client<'a>, token::StellarAssetClient<'a>) {
    let contract_address = e.register_stellar_asset_contract_v2(Address::generate(e));
    (
        contract_address.address(),
        token::Client::new(e, &contract_address.address()),
        token::StellarAssetClient::new(e, &contract_address.address()),
    )
}

fn setup_test_env<'a>() -> (
    Env,
    Address,
    Address,
    Address,
    token::Client<'a>,
    token::StellarAssetClient<'a>,
) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let (token_address, token_client, token_admin) = create_token_contract(&env);

    // Mint tokens to user1
    token_admin.mint(&user1, &100000);

    (env, admin, user1, token_address, token_client, token_admin)
}

#[test]
fn test_initialize() {
    let (env, admin, _, token_address, _, _) = setup_test_env();
    let contract_id = env.register_contract(None, NFTLotteryContract);
    let client = NFTLotteryContractClient::new(&env, &contract_id);

    // Initialize the contract
    client.initialize(&admin, &token_address);

    // Verify lottery count starts at 0
    let count = client.get_lottery_count();
    assert_eq!(count, 0);
}

#[test]
#[should_panic(expected = "Already initialized")]
fn test_initialize_twice_fails() {
    let (env, admin, _, token_address, _, _) = setup_test_env();
    let contract_id = env.register_contract(None, NFTLotteryContract);
    let client = NFTLotteryContractClient::new(&env, &contract_id);

    // Initialize the contract
    client.initialize(&admin, &token_address);

    // Try to initialize again - should panic
    client.initialize(&admin, &token_address);
}

#[test]
fn test_create_lottery() {
    let (env, admin, _, token_address, _, _) = setup_test_env();
    let contract_id = env.register_contract(None, NFTLotteryContract);
    let client = NFTLotteryContractClient::new(&env, &contract_id);

    // Initialize
    client.initialize(&admin, &token_address);

    // Create a lottery
    let ticket_price: i128 = 100;
    let max_tickets: u32 = 50;
    let nft_name = String::from_str(&env, "Dragon NFT");
    let nft_image = String::from_str(&env, "https://example.com/dragon.png");
    let nft_rarity: u32 = 4;

    let lottery_id = client.create_lottery(
        &admin,
        &ticket_price,
        &max_tickets,
        &nft_name,
        &nft_image,
        &nft_rarity,
    );

    assert_eq!(lottery_id, 1);

    // Verify lottery was created
    let lottery = client.get_lottery(&lottery_id);
    assert_eq!(lottery.id, 1);
    assert_eq!(lottery.ticket_price, 100);
    assert_eq!(lottery.max_tickets, 50);
    assert_eq!(lottery.tickets_sold, 0);
    assert_eq!(lottery.is_active, true);
    assert_eq!(lottery.winner, None);
    assert_eq!(lottery.nft_prize.name, nft_name);
    assert_eq!(lottery.nft_prize.rarity, 4);
}

#[test]
fn test_create_multiple_lotteries() {
    let (env, admin, _, token_address, _, _) = setup_test_env();
    let contract_id = env.register_contract(None, NFTLotteryContract);
    let client = NFTLotteryContractClient::new(&env, &contract_id);

    client.initialize(&admin, &token_address);

    // Create first lottery
    let lottery_id1 = client.create_lottery(
        &admin,
        &100,
        &50,
        &String::from_str(&env, "Dragon NFT"),
        &String::from_str(&env, "https://example.com/dragon.png"),
        &4,
    );

    // Create second lottery
    let lottery_id2 = client.create_lottery(
        &admin,
        &50,
        &100,
        &String::from_str(&env, "Phoenix NFT"),
        &String::from_str(&env, "https://example.com/phoenix.png"),
        &3,
    );

    assert_eq!(lottery_id1, 1);
    assert_eq!(lottery_id2, 2);

    let count = client.get_lottery_count();
    assert_eq!(count, 2);
}

#[test]
#[should_panic(expected = "Unauthorized")]
fn test_create_lottery_unauthorized() {
    let (env, admin, user1, token_address, _, _) = setup_test_env();
    let contract_id = env.register_contract(None, NFTLotteryContract);
    let client = NFTLotteryContractClient::new(&env, &contract_id);

    client.initialize(&admin, &token_address);

    // Try to create lottery as non-admin user - should fail
    client.create_lottery(
        &user1,
        &100,
        &50,
        &String::from_str(&env, "Dragon NFT"),
        &String::from_str(&env, "https://example.com/dragon.png"),
        &4,
    );
}

#[test]
fn test_buy_single_ticket() {
    let (env, admin, user1, token_address, token_client, _) = setup_test_env();
    let contract_id = env.register_contract(None, NFTLotteryContract);
    let client = NFTLotteryContractClient::new(&env, &contract_id);

    client.initialize(&admin, &token_address);

    // Create lottery
    let lottery_id = client.create_lottery(
        &admin,
        &100,
        &50,
        &String::from_str(&env, "Dragon NFT"),
        &String::from_str(&env, "https://example.com/dragon.png"),
        &4,
    );

    let initial_balance = token_client.balance(&user1);

    // User buys 1 ticket
    client.buy_ticket(&user1, &lottery_id, &1);

    // Verify lottery updated
    let lottery = client.get_lottery(&lottery_id);
    assert_eq!(lottery.tickets_sold, 1);

    // Verify user has tickets
    let user_tickets = client.get_user_tickets(&user1, &lottery_id);
    assert_eq!(user_tickets.len(), 1);
    assert_eq!(user_tickets.get(0).unwrap(), 1);

    // Verify payment was made
    let final_balance = token_client.balance(&user1);
    assert_eq!(final_balance, initial_balance - 100);
}

#[test]
fn test_buy_multiple_tickets() {
    let (env, admin, user1, token_address, token_client, _) = setup_test_env();
    let contract_id = env.register_contract(None, NFTLotteryContract);
    let client = NFTLotteryContractClient::new(&env, &contract_id);

    client.initialize(&admin, &token_address);

    let lottery_id = client.create_lottery(
        &admin,
        &100,
        &50,
        &String::from_str(&env, "Dragon NFT"),
        &String::from_str(&env, "https://example.com/dragon.png"),
        &4,
    );

    let initial_balance = token_client.balance(&user1);

    // User buys 5 tickets
    client.buy_ticket(&user1, &lottery_id, &5);

    let lottery = client.get_lottery(&lottery_id);
    assert_eq!(lottery.tickets_sold, 5);

    let user_tickets = client.get_user_tickets(&user1, &lottery_id);
    assert_eq!(user_tickets.len(), 5);
    assert_eq!(user_tickets.get(0).unwrap(), 1);
    assert_eq!(user_tickets.get(4).unwrap(), 5);

    // Verify payment: 5 tickets * 100 = 500
    let final_balance = token_client.balance(&user1);
    assert_eq!(final_balance, initial_balance - 500);
}

#[test]
fn test_multiple_users_buy_tickets() {
    let (env, admin, user1, token_address, _, token_admin) = setup_test_env();
    let user2 = Address::generate(&env);

    // Mint tokens to user2
    token_admin.mint(&user2, &100000);

    let contract_id = env.register_contract(None, NFTLotteryContract);
    let client = NFTLotteryContractClient::new(&env, &contract_id);

    client.initialize(&admin, &token_address);

    let lottery_id = client.create_lottery(
        &admin,
        &100,
        &50,
        &String::from_str(&env, "Dragon NFT"),
        &String::from_str(&env, "https://example.com/dragon.png"),
        &4,
    );

    // User1 buys 3 tickets
    client.buy_ticket(&user1, &lottery_id, &3);

    // User2 buys 2 tickets
    client.buy_ticket(&user2, &lottery_id, &2);

    let lottery = client.get_lottery(&lottery_id);
    assert_eq!(lottery.tickets_sold, 5);

    let user1_tickets = client.get_user_tickets(&user1, &lottery_id);
    assert_eq!(user1_tickets.len(), 3);

    let user2_tickets = client.get_user_tickets(&user2, &lottery_id);
    assert_eq!(user2_tickets.len(), 2);
    assert_eq!(user2_tickets.get(0).unwrap(), 4); // Tickets 4 and 5
    assert_eq!(user2_tickets.get(1).unwrap(), 5);
}

#[test]
#[should_panic(expected = "Not enough tickets available")]
fn test_buy_more_than_available() {
    let (env, admin, user1, token_address, _, _) = setup_test_env();
    let contract_id = env.register_contract(None, NFTLotteryContract);
    let client = NFTLotteryContractClient::new(&env, &contract_id);

    client.initialize(&admin, &token_address);

    let lottery_id = client.create_lottery(
        &admin,
        &100,
        &10, // Only 10 tickets available
        &String::from_str(&env, "Dragon NFT"),
        &String::from_str(&env, "https://example.com/dragon.png"),
        &4,
    );

    // Try to buy 15 tickets - should fail
    client.buy_ticket(&user1, &lottery_id, &15);
}

#[test]
fn test_draw_winner() {
    let (env, admin, user1, token_address, _, token_admin) = setup_test_env();
    let user2 = Address::generate(&env);

    // Mint tokens to user2
    token_admin.mint(&user2, &100000);

    let contract_id = env.register_contract(None, NFTLotteryContract);
    let client = NFTLotteryContractClient::new(&env, &contract_id);

    client.initialize(&admin, &token_address);

    let lottery_id = client.create_lottery(
        &admin,
        &100,
        &50,
        &String::from_str(&env, "Dragon NFT"),
        &String::from_str(&env, "https://example.com/dragon.png"),
        &4,
    );

    // Users buy tickets
    client.buy_ticket(&user1, &lottery_id, &3);
    client.buy_ticket(&user2, &lottery_id, &2);

    // Draw winner
    let winner = client.draw_winner(&admin, &lottery_id);

    // Verify winner is one of the participants
    assert!(winner == user1 || winner == user2);

    // Verify lottery is no longer active
    let lottery = client.get_lottery(&lottery_id);
    assert_eq!(lottery.is_active, false);
    assert_eq!(lottery.winner, Some(winner));
}

#[test]
#[should_panic(expected = "Unauthorized")]
fn test_draw_winner_unauthorized() {
    let (env, admin, user1, token_address, _, _) = setup_test_env();
    let contract_id = env.register_contract(None, NFTLotteryContract);
    let client = NFTLotteryContractClient::new(&env, &contract_id);

    client.initialize(&admin, &token_address);

    let lottery_id = client.create_lottery(
        &admin,
        &100,
        &50,
        &String::from_str(&env, "Dragon NFT"),
        &String::from_str(&env, "https://example.com/dragon.png"),
        &4,
    );

    client.buy_ticket(&user1, &lottery_id, &1);

    // Non-admin tries to draw winner - should fail
    client.draw_winner(&user1, &lottery_id);
}

#[test]
#[should_panic(expected = "No tickets sold")]
fn test_draw_winner_no_tickets() {
    let (env, admin, _, token_address, _, _) = setup_test_env();
    let contract_id = env.register_contract(None, NFTLotteryContract);
    let client = NFTLotteryContractClient::new(&env, &contract_id);

    client.initialize(&admin, &token_address);

    let lottery_id = client.create_lottery(
        &admin,
        &100,
        &50,
        &String::from_str(&env, "Dragon NFT"),
        &String::from_str(&env, "https://example.com/dragon.png"),
        &4,
    );

    // Try to draw winner with no tickets sold - should fail
    client.draw_winner(&admin, &lottery_id);
}

#[test]
#[should_panic(expected = "Lottery already ended")]
fn test_draw_winner_twice() {
    let (env, admin, user1, token_address, _, _) = setup_test_env();
    let contract_id = env.register_contract(None, NFTLotteryContract);
    let client = NFTLotteryContractClient::new(&env, &contract_id);

    client.initialize(&admin, &token_address);

    let lottery_id = client.create_lottery(
        &admin,
        &100,
        &50,
        &String::from_str(&env, "Dragon NFT"),
        &String::from_str(&env, "https://example.com/dragon.png"),
        &4,
    );

    client.buy_ticket(&user1, &lottery_id, &1);
    client.draw_winner(&admin, &lottery_id);

    // Try to draw winner again - should fail
    client.draw_winner(&admin, &lottery_id);
}

#[test]
#[should_panic(expected = "Lottery not active")]
fn test_buy_ticket_after_draw() {
    let (env, admin, user1, token_address, _, _) = setup_test_env();
    let contract_id = env.register_contract(None, NFTLotteryContract);
    let client = NFTLotteryContractClient::new(&env, &contract_id);

    client.initialize(&admin, &token_address);

    let lottery_id = client.create_lottery(
        &admin,
        &100,
        &50,
        &String::from_str(&env, "Dragon NFT"),
        &String::from_str(&env, "https://example.com/dragon.png"),
        &4,
    );

    client.buy_ticket(&user1, &lottery_id, &1);
    client.draw_winner(&admin, &lottery_id);

    // Try to buy ticket after winner drawn - should fail
    client.buy_ticket(&user1, &lottery_id, &1);
}

#[test]
fn test_get_user_tickets_no_tickets() {
    let (env, admin, user1, token_address, _, _) = setup_test_env();
    let contract_id = env.register_contract(None, NFTLotteryContract);
    let client = NFTLotteryContractClient::new(&env, &contract_id);

    client.initialize(&admin, &token_address);

    let lottery_id = client.create_lottery(
        &admin,
        &100,
        &50,
        &String::from_str(&env, "Dragon NFT"),
        &String::from_str(&env, "https://example.com/dragon.png"),
        &4,
    );

    // User hasn't bought any tickets
    let user_tickets = client.get_user_tickets(&user1, &lottery_id);
    assert_eq!(user_tickets.len(), 0);
}

#[test]
fn test_complete_lottery_flow() {
    let (env, admin, user1, token_address, token_client, token_admin) = setup_test_env();
    let user2 = Address::generate(&env);
    let user3 = Address::generate(&env);

    // Mint tokens to user2 and user3
    token_admin.mint(&user2, &100000);
    token_admin.mint(&user3, &100000);

    let contract_id = env.register_contract(None, NFTLotteryContract);
    let client = NFTLotteryContractClient::new(&env, &contract_id);

    // 1. Initialize contract
    client.initialize(&admin, &token_address);

    // 2. Create lottery
    let lottery_id = client.create_lottery(
        &admin,
        &100,
        &10,
        &String::from_str(&env, "Legendary Dragon"),
        &String::from_str(&env, "https://example.com/dragon.png"),
        &4,
    );

    // 3. Multiple users buy tickets
    client.buy_ticket(&user1, &lottery_id, &4);
    client.buy_ticket(&user2, &lottery_id, &3);
    client.buy_ticket(&user3, &lottery_id, &3);

    // 4. Verify all tickets sold
    let lottery = client.get_lottery(&lottery_id);
    assert_eq!(lottery.tickets_sold, 10);
    assert_eq!(lottery.is_active, true);

    // 5. Draw winner
    let winner = client.draw_winner(&admin, &lottery_id);

    // 6. Verify final state
    let final_lottery = client.get_lottery(&lottery_id);
    assert_eq!(final_lottery.is_active, false);
    assert_eq!(final_lottery.winner, Some(winner.clone()));

    // 7. Verify winner is one of the participants
    assert!(winner == user1 || winner == user2 || winner == user3);

    // 8. Verify contract received payments
    let contract_balance = token_client.balance(&contract_id);
    assert_eq!(contract_balance, 1000); // 10 tickets * 100
}
