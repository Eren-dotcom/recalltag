use super::*;
use near_sdk::{test_utils::VMContextBuilder, testing_env};
fn account(s: &str) -> AccountId {
    s.parse().unwrap()
}
fn context(who: &str) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(account("registry.testnet"))
        .predecessor_account_id(account(who))
        .attached_deposit(NearToken::from_near(1));
    testing_env!(b.build());
}
fn setup() -> Contract {
    context("registry.testnet");
    let mut c = Contract::new(account("issuer.testnet"));
    context("issuer.testnet");
    c.create_batch(
        "B1".into(),
        "Fictional battery".into(),
        account("service.testnet"),
    );
    c.register_item("I1".into(), "B1".into());
    c
}
fn recall(c: &mut Contract, id: &str) {
    context("issuer.testnet");
    c.issue_recall(
        id.into(),
        "B1".into(),
        "Stop use and arrange service.".into(),
    );
}
#[test]
fn full_flow() {
    let mut c = setup();
    recall(&mut c, "R1");
    context("issuer.testnet");
    c.acknowledge("I1".into(), "R1".into());
    c.propose_transfer("I1".into(), account("bob.testnet"));
    context("bob.testnet");
    c.accept_transfer("I1".into(), 1, 0);
    let i = c.get_item("I1".into()).unwrap();
    assert_eq!(i.holder, account("bob.testnet"));
    assert_eq!(i.epoch, 1);
    assert!(i.repairs.is_empty());
    c.acknowledge("I1".into(), "R1".into());
    context("service.testnet");
    c.record_remediation("I1".into(), "R1".into(), "Replaced affected module.".into());
    assert_eq!(c.get_item("I1".into()).unwrap().repairs.len(), 1);
}
#[test]
#[should_panic(expected = "Issuer only")]
fn unauthorized_recall() {
    let mut c = setup();
    context("outsider.testnet");
    c.issue_recall(
        "R1".into(),
        "B1".into(),
        "Unauthorized recall attempt.".into(),
    );
}
#[test]
#[should_panic(expected = "Service center only")]
fn owner_cannot_repair() {
    let mut c = setup();
    recall(&mut c, "R1");
    c.record_remediation(
        "I1".into(),
        "R1".into(),
        "Fake repair by current owner.".into(),
    );
}
#[test]
#[should_panic(expected = "Safety state changed")]
fn stale_acceptance_rejected() {
    let mut c = setup();
    context("issuer.testnet");
    c.propose_transfer("I1".into(), account("bob.testnet"));
    recall(&mut c, "R1");
    context("bob.testnet");
    c.accept_transfer("I1".into(), 0, 0);
}
#[test]
fn returning_holder_new_epoch() {
    let mut c = setup();
    recall(&mut c, "R1");
    c.acknowledge("I1".into(), "R1".into());
    c.propose_transfer("I1".into(), account("bob.testnet"));
    context("bob.testnet");
    c.accept_transfer("I1".into(), 1, 0);
    c.propose_transfer("I1".into(), account("issuer.testnet"));
    context("issuer.testnet");
    c.accept_transfer("I1".into(), 1, 0);
    c.acknowledge("I1".into(), "R1".into());
    assert_eq!(c.get_item("I1".into()).unwrap().acks.len(), 2);
}
#[test]
#[should_panic(expected = "Recipient only")]
fn wrong_recipient() {
    let mut c = setup();
    c.propose_transfer("I1".into(), account("bob.testnet"));
    context("eve.testnet");
    c.accept_transfer("I1".into(), 0, 0);
}
#[test]
#[should_panic(expected = "Already remediated")]
fn duplicate_repair() {
    let mut c = setup();
    recall(&mut c, "R1");
    context("service.testnet");
    c.record_remediation(
        "I1".into(),
        "R1".into(),
        "First remediation recorded.".into(),
    );
    c.record_remediation("I1".into(), "R1".into(), "Duplicate record attempt.".into());
}
#[test]
fn pagination_and_cancel() {
    let mut c = setup();
    c.propose_transfer("I1".into(), account("bob.testnet"));
    c.cancel_transfer("I1".into());
    assert!(c.get_item("I1".into()).unwrap().pending.is_none());
    assert_eq!(c.list_items(None, Some(100)).len(), 1);
    assert_eq!(c.list_items(Some(1), None).len(), 0);
}
#[test]
#[should_panic(expected = "Batch exists")]
fn duplicate_batch() {
    let mut c = setup();
    c.create_batch("B1".into(), "Duplicate".into(), account("service.testnet"));
}
#[test]
#[should_panic(expected = "Insufficient storage deposit")]
fn storage_payment_required() {
    let mut c = setup();
    let mut b = VMContextBuilder::new();
    b.current_account_id(account("registry.testnet"))
        .predecessor_account_id(account("issuer.testnet"));
    testing_env!(b.build());
    c.register_item("I2".into(), "B1".into());
}
