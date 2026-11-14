use near_sdk::collections::UnorderedMap;
use near_sdk::{env, near, AccountId, NearToken, PanicOnDefault, Promise};

#[near(serializers=[borsh,json])]
#[derive(Clone)]
pub struct Batch {
    pub id: String,
    pub model: String,
    pub issuer: AccountId,
    pub service: AccountId,
    pub revision: u32,
    pub recalls: Vec<String>,
}
#[near(serializers=[borsh,json])]
#[derive(Clone)]
pub struct Recall {
    pub id: String,
    pub batch: String,
    pub reason: String,
    pub issuer: AccountId,
    pub at: String,
}
#[near(serializers=[borsh,json])]
#[derive(Clone)]
pub struct Ack {
    pub recall_id: String,
    pub holder: AccountId,
    pub epoch: u32,
}
#[near(serializers=[borsh,json])]
#[derive(Clone)]
pub struct Repair {
    pub recall_id: String,
    pub by: AccountId,
    pub note: String,
    pub at: String,
}
#[near(serializers=[borsh,json])]
#[derive(Clone)]
pub struct Item {
    pub id: String,
    pub batch: String,
    pub holder: AccountId,
    pub pending: Option<AccountId>,
    pub epoch: u32,
    pub acks: Vec<Ack>,
    pub repairs: Vec<Repair>,
}
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    pub issuer: AccountId,
    batches: UnorderedMap<String, Batch>,
    items: UnorderedMap<String, Item>,
    recalls: UnorderedMap<String, Recall>,
}
fn text(s: &str, min: usize, max: usize) {
    assert!(
        s.trim().len() >= min && s.len() <= max,
        "Invalid text length"
    );
}
fn identifier(s: &str) {
    text(s, 1, 64);
    assert!(
        s.bytes()
            .all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_'),
        "Invalid identifier"
    );
}
fn event(kind: &str, data: near_sdk::serde_json::Value) {
    env::log_str(&format!(
        "EVENT_JSON:{}",
        near_sdk::serde_json::json!({"standard":"recalltag","version":"1.0.0","event":kind,"data":[data]})
    ));
}
fn settle(before: u64) {
    let used = env::storage_usage().saturating_sub(before) as u128;
    let cost = used
        .checked_mul(env::storage_byte_cost().as_yoctonear())
        .expect("Cost overflow");
    let attached = env::attached_deposit().as_yoctonear();
    assert!(attached >= cost, "Insufficient storage deposit");
    let refund = attached - cost;
    if refund > 0 {
        let _ =
            Promise::new(env::predecessor_account_id()).transfer(NearToken::from_yoctonear(refund));
    }
}
#[near]
impl Contract {
    #[init]
    pub fn new(issuer: AccountId) -> Self {
        assert_eq!(
            env::predecessor_account_id(),
            env::current_account_id(),
            "Initialize in the deploy-account transaction"
        );
        Self {
            issuer,
            batches: UnorderedMap::new(b"b"),
            items: UnorderedMap::new(b"i"),
            recalls: UnorderedMap::new(b"r"),
        }
    }
    pub fn get_batch(&self, id: String) -> Option<Batch> {
        self.batches.get(&id)
    }
    pub fn get_item(&self, id: String) -> Option<Item> {
        self.items.get(&id)
    }
    pub fn get_recall(&self, id: String) -> Option<Recall> {
        self.recalls.get(&id)
    }
    pub fn list_items(&self, from_index: Option<u64>, limit: Option<u64>) -> Vec<Item> {
        {
            let values = self.items.values_as_vector();
            let start = from_index.unwrap_or(0).min(values.len());
            let end = start
                .saturating_add(limit.unwrap_or(20).min(50))
                .min(values.len());
            (start..end).filter_map(|n| values.get(n)).collect()
        }
    }
    pub fn list_batches(&self, from_index: Option<u64>, limit: Option<u64>) -> Vec<Batch> {
        {
            let values = self.batches.values_as_vector();
            let start = from_index.unwrap_or(0).min(values.len());
            let end = start
                .saturating_add(limit.unwrap_or(20).min(50))
                .min(values.len());
            (start..end).filter_map(|n| values.get(n)).collect()
        }
    }
    #[payable]
    pub fn create_batch(&mut self, id: String, model: String, service: AccountId) {
        let before = env::storage_usage();
        assert_eq!(env::predecessor_account_id(), self.issuer, "Issuer only");
        identifier(&id);
        text(&model, 1, 100);
        assert!(self.batches.get(&id).is_none(), "Batch exists");
        self.batches.insert(
            &id,
            &Batch {
                id: id.clone(),
                model,
                issuer: self.issuer.clone(),
                service,
                revision: 0,
                recalls: vec![],
            },
        );
        event(
            "batch_created",
            near_sdk::serde_json::json!({"batch":id,"actor":env::predecessor_account_id()}),
        );
        settle(before);
    }
    #[payable]
    pub fn register_item(&mut self, id: String, batch: String) {
        let before = env::storage_usage();
        identifier(&id);
        let b = self.batches.get(&batch).expect("Batch missing");
        assert_eq!(env::predecessor_account_id(), b.issuer, "Issuer only");
        assert!(self.items.get(&id).is_none(), "Item exists");
        self.items.insert(
            &id,
            &Item {
                id: id.clone(),
                batch: batch.clone(),
                holder: b.issuer,
                pending: None,
                epoch: 0,
                acks: vec![],
                repairs: vec![],
            },
        );
        event(
            "item_registered",
            near_sdk::serde_json::json!({"item":id,"batch":batch}),
        );
        settle(before);
    }
    #[payable]
    pub fn issue_recall(&mut self, id: String, batch: String, reason: String) {
        let before = env::storage_usage();
        identifier(&id);
        text(&reason, 10, 500);
        let mut b = self.batches.get(&batch).expect("Batch missing");
        assert_eq!(env::predecessor_account_id(), b.issuer, "Issuer only");
        assert!(self.recalls.get(&id).is_none(), "Recall exists");
        assert!(b.recalls.len() < 100, "Batch recall limit reached");
        b.revision = b.revision.checked_add(1).expect("Revision overflow");
        b.recalls.push(id.clone());
        self.recalls.insert(
            &id,
            &Recall {
                id: id.clone(),
                batch: batch.clone(),
                reason,
                issuer: b.issuer.clone(),
                at: env::block_timestamp().to_string(),
            },
        );
        self.batches.insert(&batch, &b);
        event(
            "recall_issued",
            near_sdk::serde_json::json!({"recall":id,"batch":batch,"revision":b.revision}),
        );
        settle(before);
    }
    #[payable]
    pub fn acknowledge(&mut self, item_id: String, recall_id: String) {
        let before = env::storage_usage();
        let mut i = self.items.get(&item_id).expect("Item missing");
        assert_eq!(env::predecessor_account_id(), i.holder, "Holder only");
        let r = self.recalls.get(&recall_id).expect("Recall missing");
        assert_eq!(r.batch, i.batch, "Wrong batch");
        assert!(
            !i.acks
                .iter()
                .any(|a| a.recall_id == recall_id && a.epoch == i.epoch),
            "Already acknowledged"
        );
        assert!(i.acks.len() < 500, "Acknowledgement limit reached");
        i.acks.push(Ack {
            recall_id: recall_id.clone(),
            holder: i.holder.clone(),
            epoch: i.epoch,
        });
        self.items.insert(&item_id, &i);
        event(
            "acknowledged",
            near_sdk::serde_json::json!({"item":item_id,"recall":recall_id,"epoch":i.epoch,"actor":i.holder}),
        );
        settle(before);
    }
    #[payable]
    pub fn propose_transfer(&mut self, item_id: String, to: AccountId) {
        let before = env::storage_usage();
        let mut i = self.items.get(&item_id).expect("Item missing");
        assert_eq!(env::predecessor_account_id(), i.holder, "Holder only");
        assert!(i.pending.is_none(), "Transfer pending");
        assert_ne!(to, i.holder, "Self transfer");
        i.pending = Some(to.clone());
        self.items.insert(&item_id, &i);
        event(
            "handover_proposed",
            near_sdk::serde_json::json!({"item":item_id,"to":to}),
        );
        settle(before);
    }
    #[payable]
    pub fn accept_transfer(
        &mut self,
        item_id: String,
        expected_revision: u32,
        expected_repair_count: u32,
    ) {
        let before = env::storage_usage();
        let mut i = self.items.get(&item_id).expect("Item missing");
        let caller = env::predecessor_account_id();
        assert_eq!(i.pending.as_ref(), Some(&caller), "Recipient only");
        let b = self.batches.get(&i.batch).unwrap();
        assert_eq!(
            b.revision, expected_revision,
            "Safety state changed: review latest recall notices"
        );
        assert_eq!(
            i.repairs.len() as u32,
            expected_repair_count,
            "Service state changed: review latest record"
        );
        i.holder = caller;
        i.epoch = i.epoch.checked_add(1).expect("Epoch overflow");
        i.pending = None;
        self.items.insert(&item_id, &i);
        event(
            "handover_accepted",
            near_sdk::serde_json::json!({"item":item_id,"holder":i.holder,"reviewed_revision":b.revision,"epoch":i.epoch}),
        );
        settle(before);
    }
    #[payable]
    pub fn cancel_transfer(&mut self, item_id: String) {
        let before = env::storage_usage();
        let mut i = self.items.get(&item_id).expect("Item missing");
        assert_eq!(env::predecessor_account_id(), i.holder, "Holder only");
        assert!(i.pending.is_some(), "No transfer pending");
        i.pending = None;
        self.items.insert(&item_id, &i);
        event(
            "handover_cancelled",
            near_sdk::serde_json::json!({"item":item_id}),
        );
        settle(before);
    }
    #[payable]
    pub fn record_remediation(&mut self, item_id: String, recall_id: String, note: String) {
        let before = env::storage_usage();
        text(&note, 10, 500);
        let mut i = self.items.get(&item_id).expect("Item missing");
        let b = self.batches.get(&i.batch).unwrap();
        assert_eq!(
            env::predecessor_account_id(),
            b.service,
            "Service center only"
        );
        let r = self.recalls.get(&recall_id).expect("Recall missing");
        assert_eq!(r.batch, i.batch, "Wrong batch");
        assert!(
            !i.repairs.iter().any(|p| p.recall_id == recall_id),
            "Already remediated"
        );
        assert!(i.repairs.len() < 100, "Repair limit reached");
        i.repairs.push(Repair {
            recall_id: recall_id.clone(),
            by: b.service,
            note,
            at: env::block_timestamp().to_string(),
        });
        self.items.insert(&item_id, &i);
        event(
            "remediation_recorded",
            near_sdk::serde_json::json!({"item":item_id,"recall":recall_id,"actor":env::predecessor_account_id()}),
        );
        settle(before);
    }
}
#[cfg(test)]
mod tests;
