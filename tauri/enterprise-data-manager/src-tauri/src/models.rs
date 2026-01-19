use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Customer {
    pub id: Option<i64>,
    pub name: String,
    pub contact: String,
    pub phone: String,
    pub email: String,
    pub address: String,
    pub notes: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Contract {
    pub id: Option<i64>,
    pub contract_no: String,
    pub customer_name: String,
    pub title: String,
    pub amount: f64,
    pub start_date: String,
    pub end_date: String,
    pub status: String,
    pub notes: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Equipment {
    pub id: Option<i64>,
    pub asset_no: String,
    pub name: String,
    pub category: String,
    pub model: String,
    pub manufacturer: String,
    pub purchase_date: String,
    pub price: f64,
    pub location: String,
    pub status: String,
    pub notes: String,
}