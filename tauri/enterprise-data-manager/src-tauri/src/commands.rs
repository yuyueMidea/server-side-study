use crate::database::{get_connection, DbState};
use crate::models::{Customer, Contract, Equipment};
use tauri::State;

// ========== 客户管理命令 ==========

#[tauri::command]
pub fn get_all_customers(state: State<DbState>) -> Result<Vec<Customer>, String> {
    let conn = get_connection(&state.path).map_err(|e| e.to_string())?;
    
    let mut stmt = conn
        .prepare("SELECT id, name, contact, phone, email, address, notes FROM customers ORDER BY id DESC")
        .map_err(|e| e.to_string())?;
    
    let customers = stmt
        .query_map([], |row| {
            Ok(Customer {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                contact: row.get(2)?,
                phone: row.get(3)?,
                email: row.get(4)?,
                address: row.get(5)?,
                notes: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    
    Ok(customers)
}

#[tauri::command]
pub fn create_customer(customer: Customer, state: State<DbState>) -> Result<(), String> {
    let conn = get_connection(&state.path).map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO customers (name, contact, phone, email, address, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (
            &customer.name,
            &customer.contact,
            &customer.phone,
            &customer.email,
            &customer.address,
            &customer.notes,
        ),
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn update_customer(id: i64, customer: Customer, state: State<DbState>) -> Result<(), String> {
    let conn = get_connection(&state.path).map_err(|e| e.to_string())?;
    
    conn.execute(
        "UPDATE customers SET name=?1, contact=?2, phone=?3, email=?4, address=?5, notes=?6 WHERE id=?7",
        (
            &customer.name,
            &customer.contact,
            &customer.phone,
            &customer.email,
            &customer.address,
            &customer.notes,
            id,
        ),
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn delete_customer(id: i64, state: State<DbState>) -> Result<(), String> {
    let conn = get_connection(&state.path).map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM customers WHERE id=?1", [id])
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

// ========== 合同管理命令 ==========

#[tauri::command]
pub fn get_all_contracts(state: State<DbState>) -> Result<Vec<Contract>, String> {
    let conn = get_connection(&state.path).map_err(|e| e.to_string())?;
    
    let mut stmt = conn
        .prepare("SELECT id, contract_no, customer_name, title, amount, start_date, end_date, status, notes FROM contracts ORDER BY id DESC")
        .map_err(|e| e.to_string())?;
    
    let contracts = stmt
        .query_map([], |row| {
            Ok(Contract {
                id: Some(row.get(0)?),
                contract_no: row.get(1)?,
                customer_name: row.get(2)?,
                title: row.get(3)?,
                amount: row.get(4)?,
                start_date: row.get(5)?,
                end_date: row.get(6)?,
                status: row.get(7)?,
                notes: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    
    Ok(contracts)
}

#[tauri::command]
pub fn create_contract(contract: Contract, state: State<DbState>) -> Result<(), String> {
    let conn = get_connection(&state.path).map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO contracts (contract_no, customer_name, title, amount, start_date, end_date, status, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        (
            &contract.contract_no,
            &contract.customer_name,
            &contract.title,
            &contract.amount,
            &contract.start_date,
            &contract.end_date,
            &contract.status,
            &contract.notes,
        ),
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn update_contract(id: i64, contract: Contract, state: State<DbState>) -> Result<(), String> {
    let conn = get_connection(&state.path).map_err(|e| e.to_string())?;
    
    conn.execute(
        "UPDATE contracts SET contract_no=?1, customer_name=?2, title=?3, amount=?4, start_date=?5, end_date=?6, status=?7, notes=?8 WHERE id=?9",
        (
            &contract.contract_no,
            &contract.customer_name,
            &contract.title,
            &contract.amount,
            &contract.start_date,
            &contract.end_date,
            &contract.status,
            &contract.notes,
            id,
        ),
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn delete_contract(id: i64, state: State<DbState>) -> Result<(), String> {
    let conn = get_connection(&state.path).map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM contracts WHERE id=?1", [id])
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

// ========== 设备管理命令 ==========

#[tauri::command]
pub fn get_all_equipment(state: State<DbState>) -> Result<Vec<Equipment>, String> {
    let conn = get_connection(&state.path).map_err(|e| e.to_string())?;
    
    let mut stmt = conn
        .prepare("SELECT id, asset_no, name, category, model, manufacturer, purchase_date, price, location, status, notes FROM equipment ORDER BY id DESC")
        .map_err(|e| e.to_string())?;
    
    let equipment = stmt
        .query_map([], |row| {
            Ok(Equipment {
                id: Some(row.get(0)?),
                asset_no: row.get(1)?,
                name: row.get(2)?,
                category: row.get(3)?,
                model: row.get(4)?,
                manufacturer: row.get(5)?,
                purchase_date: row.get(6)?,
                price: row.get(7)?,
                location: row.get(8)?,
                status: row.get(9)?,
                notes: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    
    Ok(equipment)
}

#[tauri::command]
pub fn create_equipment(equipment: Equipment, state: State<DbState>) -> Result<(), String> {
    let conn = get_connection(&state.path).map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO equipment (asset_no, name, category, model, manufacturer, purchase_date, price, location, status, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        (
            &equipment.asset_no,
            &equipment.name,
            &equipment.category,
            &equipment.model,
            &equipment.manufacturer,
            &equipment.purchase_date,
            &equipment.price,
            &equipment.location,
            &equipment.status,
            &equipment.notes,
        ),
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn update_equipment(id: i64, equipment: Equipment, state: State<DbState>) -> Result<(), String> {
    let conn = get_connection(&state.path).map_err(|e| e.to_string())?;
    
    conn.execute(
        "UPDATE equipment SET asset_no=?1, name=?2, category=?3, model=?4, manufacturer=?5, purchase_date=?6, price=?7, location=?8, status=?9, notes=?10 WHERE id=?11",
        (
            &equipment.asset_no,
            &equipment.name,
            &equipment.category,
            &equipment.model,
            &equipment.manufacturer,
            &equipment.purchase_date,
            &equipment.price,
            &equipment.location,
            &equipment.status,
            &equipment.notes,
            id,
        ),
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn delete_equipment(id: i64, state: State<DbState>) -> Result<(), String> {
    let conn = get_connection(&state.path).map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM equipment WHERE id=?1", [id])
        .map_err(|e| e.to_string())?;
    
    Ok(())
}