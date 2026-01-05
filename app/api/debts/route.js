// app/api/debts/route.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId requis' }), { status: 400 });
    }

    let query = supabase
      .from('debts')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true })
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (type) query = query.eq('type', type);

    const { data, error } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ data }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      user_id, 
      title, 
      description, 
      amount, 
      type, 
      creditor_debtor, 
      due_date, 
      category, 
      priority 
    } = body;

    // Validation des champs requis
    const required = ['user_id', 'title', 'amount', 'type', 'creditor_debtor'];
    const missing = required.filter(field => !body[field]);
    
    if (missing.length > 0) {
      return new Response(JSON.stringify({ 
        error: 'Champs requis manquants',
        missing: missing
      }), { status: 400 });
    }

    // Validation du montant
    if (parseFloat(amount) <= 0) {
      return new Response(JSON.stringify({ error: 'Le montant doit être supérieur à 0' }), { status: 400 });
    }

    // Validation du type
    if (!['owed', 'owing'].includes(type)) {
      return new Response(JSON.stringify({ error: 'Type doit être "owed" (dette) ou "owing" (créance)' }), { status: 400 });
    }

    // Validation de la priorité
    if (!['low', 'medium', 'high'].includes(priority)) {
      return new Response(JSON.stringify({ error: 'Priorité invalide' }), { status: 400 });
    }

    // Validation de la date d'échéance
    if (due_date && new Date(due_date) < new Date()) {
      return new Response(JSON.stringify({ error: 'La date d\'échéance ne peut être dans le passé' }), { status: 400 });
    }

    const debtData = {
      user_id,
      title: title.trim(),
      description: description?.trim() || null,
      amount: parseFloat(amount),
      type,
      creditor_debtor: creditor_debtor.trim(),
      due_date: due_date || null,
      category: category?.trim() || null,
      priority: priority || 'medium',
      status: 'pending'
    };

    const { data, error } = await supabase
      .from('debts')
      .insert([debtData])
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ data }), { status: 201 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requis' }), { status: 400 });
    }

    // Validation du type si fourni
    if (updateData.type && !['owed', 'owing'].includes(updateData.type)) {
      return new Response(JSON.stringify({ error: 'Type doit être "owed" ou "owing"' }), { status: 400 });
    }

    // Validation de la priorité si fournie
    if (updateData.priority && !['low', 'medium', 'high'].includes(updateData.priority)) {
      return new Response(JSON.stringify({ error: 'Priorité invalide' }), { status: 400 });
    }

    // Nettoyer les données
    const cleanData = {};
    if (updateData.title !== undefined) cleanData.title = updateData.title.trim();
    if (updateData.description !== undefined) cleanData.description = updateData.description?.trim() || null;
    if (updateData.amount !== undefined) cleanData.amount = parseFloat(updateData.amount);
    if (updateData.type !== undefined) cleanData.type = updateData.type;
    if (updateData.creditor_debtor !== undefined) cleanData.creditor_debtor = updateData.creditor_debtor.trim();
    if (updateData.due_date !== undefined) cleanData.due_date = updateData.due_date;
    if (updateData.category !== undefined) cleanData.category = updateData.category?.trim() || null;
    if (updateData.priority !== undefined) cleanData.priority = updateData.priority;
    if (updateData.status !== undefined) cleanData.status = updateData.status;

    const { data, error } = await supabase
      .from('debts')
      .update({ ...cleanData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', updateData.user_id) // Sécurité: l'utilisateur ne peut modifier que ses propres dettes
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ data }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
      return new Response(JSON.stringify({ error: 'ID et userId requis' }), { status: 400 });
    }

    const { data, error } = await supabase
      .from('debts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId) // Sécurité: l'utilisateur ne peut supprimer que ses propres dettes
      .select();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ message: 'Dette supprimée avec succès' }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
