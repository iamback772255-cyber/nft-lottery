#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, String, Vec};

#[derive(Clone)]
#[contracttype]
pub struct NFTMetadata {
    pub name: String,
    pub image_url: String,
    pub rarity: u32, // 1=Common, 2=Rare, 3=Epic, 4=Legendary
}

#[derive(Clone)]
#[contracttype]
pub struct Lottery {
    pub id: u64,
    pub ticket_price: i128,
    pub max_tickets: u32,
    pub tickets_sold: u32,
    pub is_active: bool,
    pub winner: Option<Address>,
    pub nft_prize: NFTMetadata,
}

#[derive(Clone)]
#[contracttype]
pub struct Ticket {
    pub lottery_id: u64,
    pub owner: Address,
    pub ticket_number: u32,
}

#[contracttype]
pub enum DataKey {
    Admin,
    LotteryCount,
    Lottery(u64),
    Tickets(u64),              // lottery_id -> Vec<Ticket>
    UserTickets(Address, u64), // (user, lottery_id) -> Vec<u32>
    PaymentToken,
}

#[contract]
pub struct NFTLotteryContract;

#[contractimpl]
impl NFTLotteryContract {
    /// Initialize the contract with admin and payment token
    pub fn initialize(env: Env, admin: Address, payment_token: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::PaymentToken, &payment_token);
        env.storage().instance().set(&DataKey::LotteryCount, &0u64);
    }

    /// Create a new lottery
    pub fn create_lottery(
        env: Env,
        admin: Address,
        ticket_price: i128,
        max_tickets: u32,
        nft_name: String,
        nft_image: String,
        nft_rarity: u32,
    ) -> u64 {
        admin.require_auth();

        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if admin != stored_admin {
            panic!("Unauthorized");
        }

        let lottery_count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::LotteryCount)
            .unwrap_or(0);
        let lottery_id = lottery_count + 1;

        let nft_metadata = NFTMetadata {
            name: nft_name,
            image_url: nft_image,
            rarity: nft_rarity,
        };

        let lottery = Lottery {
            id: lottery_id,
            ticket_price,
            max_tickets,
            tickets_sold: 0,
            is_active: true,
            winner: None,
            nft_prize: nft_metadata,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Lottery(lottery_id), &lottery);
        env.storage()
            .instance()
            .set(&DataKey::LotteryCount, &lottery_id);

        // Initialize empty ticket list
        let empty_tickets: Vec<Ticket> = Vec::new(&env);
        env.storage()
            .persistent()
            .set(&DataKey::Tickets(lottery_id), &empty_tickets);

        lottery_id
    }

    /// Buy lottery tickets
    pub fn buy_ticket(env: Env, buyer: Address, lottery_id: u64, num_tickets: u32) {
        buyer.require_auth();

        let mut lottery: Lottery = env
            .storage()
            .persistent()
            .get(&DataKey::Lottery(lottery_id))
            .unwrap();

        if !lottery.is_active {
            panic!("Lottery not active");
        }

        if lottery.tickets_sold + num_tickets > lottery.max_tickets {
            panic!("Not enough tickets available");
        }

        // Transfer payment
        let payment_token: Address = env
            .storage()
            .instance()
            .get(&DataKey::PaymentToken)
            .unwrap();
        let token_client = token::Client::new(&env, &payment_token);
        let total_cost = lottery.ticket_price * (num_tickets as i128);

        token_client.transfer(&buyer, &env.current_contract_address(), &total_cost);

        // Create tickets
        let mut all_tickets: Vec<Ticket> = env
            .storage()
            .persistent()
            .get(&DataKey::Tickets(lottery_id))
            .unwrap();

        let mut user_ticket_numbers: Vec<u32> = env
            .storage()
            .persistent()
            .get(&DataKey::UserTickets(buyer.clone(), lottery_id))
            .unwrap_or(Vec::new(&env));

        for i in 0..num_tickets {
            let ticket_number = lottery.tickets_sold + i + 1;
            let ticket = Ticket {
                lottery_id,
                owner: buyer.clone(),
                ticket_number,
            };
            all_tickets.push_back(ticket);
            user_ticket_numbers.push_back(ticket_number);
        }

        lottery.tickets_sold += num_tickets;

        // Save updates
        env.storage()
            .persistent()
            .set(&DataKey::Lottery(lottery_id), &lottery);
        env.storage()
            .persistent()
            .set(&DataKey::Tickets(lottery_id), &all_tickets);
        env.storage().persistent().set(
            &DataKey::UserTickets(buyer, lottery_id),
            &user_ticket_numbers,
        );
    }

    /// Draw winner (only admin)
    pub fn draw_winner(env: Env, admin: Address, lottery_id: u64) -> Address {
        admin.require_auth();

        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if admin != stored_admin {
            panic!("Unauthorized");
        }

        let mut lottery: Lottery = env
            .storage()
            .persistent()
            .get(&DataKey::Lottery(lottery_id))
            .unwrap();

        if !lottery.is_active {
            panic!("Lottery already ended");
        }

        if lottery.tickets_sold == 0 {
            panic!("No tickets sold");
        }

        let all_tickets: Vec<Ticket> = env
            .storage()
            .persistent()
            .get(&DataKey::Tickets(lottery_id))
            .unwrap();

        // Simple random selection using ledger sequence
        let random_index = (env.ledger().sequence() as u32) % lottery.tickets_sold;
        let winning_ticket = all_tickets.get(random_index).unwrap();

        lottery.winner = Some(winning_ticket.owner.clone());
        lottery.is_active = false;

        env.storage()
            .persistent()
            .set(&DataKey::Lottery(lottery_id), &lottery);

        winning_ticket.owner
    }

    /// Get lottery details
    pub fn get_lottery(env: Env, lottery_id: u64) -> Lottery {
        env.storage()
            .persistent()
            .get(&DataKey::Lottery(lottery_id))
            .unwrap()
    }

    /// Get user's tickets for a lottery
    pub fn get_user_tickets(env: Env, user: Address, lottery_id: u64) -> Vec<u32> {
        env.storage()
            .persistent()
            .get(&DataKey::UserTickets(user, lottery_id))
            .unwrap_or(Vec::new(&env))
    }

    /// Get total lottery count
    pub fn get_lottery_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::LotteryCount)
            .unwrap_or(0)
    }
}

mod test;
