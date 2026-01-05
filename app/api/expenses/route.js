// app/api/expenses/route.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId requis' }), { status: 400 });
    }

    let query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    } else if (startDate) {
      query = query.gte('date', startDate);
    }

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
    const { user_id, type, amount, category, description, payment_method, date } = body;

    if (!user_id || !type || !amount || !category || !payment_method || !date) {
      return new Response(JSON.stringify({ 
        error: 'Champs requis manquants',
        required: ['user_id', 'type', 'amount', 'category', 'payment_method', 'date']
      }), { status: 400 });
    }

    // Validation du montant
    if (parseFloat(amount) <= 0) {
      return new Response(JSON.stringify({ error: 'Le montant doit être supérieur à 0' }), { status: 400 });
    }

    // Validation du type
    if (!['expense', 'income'].includes(type)) {
      return new Response(JSON.stringify({ error: 'Type doit être "expense" ou "income"' }), { status: 400 });
    }

    const expenseData = {
      user_id,
      type, // 'expense' ou 'income'
      amount: parseFloat(amount),
      category,
      description: description?.trim() || null,
      payment_method,
      date,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('expenses')
      .insert([expenseData])
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

    // Validation du montant si fourni
    if (updateData.amount && parseFloat(updateData.amount) <= 0) {
      return new Response(JSON.stringify({ error: 'Le montant doit être supérieur à 0' }), { status: 400 });
    }

    // Validation du type si fourni
    if (updateData.type && !['expense', 'income'].includes(updateData.type)) {
      return new Response(JSON.stringify({ error: 'Type doit être "expense" ou "income"' }), { status: 400 });
    }

    // Nettoyer les données
    const cleanData = {};
    if (updateData.amount) cleanData.amount = parseFloat(updateData.amount);
    if (updateData.category) cleanData.category = updateData.category;
    if (updateData.description !== undefined) cleanData.description = updateData.description?.trim() || null;
    if (updateData.payment_method) cleanData.payment_method = updateData.payment_method;
    if (updateData.type) cleanData.type = updateData.type;

    const { data, error } = await supabase
      .from('expenses')
      .update(cleanData)
      .eq('id', id)
      .eq('user_id', updateData.user_id) // Sécurité: l'utilisateur ne peut modifier que ses propres dépenses
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
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId) // Sécurité: l'utilisateur ne peut supprimer que ses propres dépenses
      .select();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ message: 'Transaction supprimée avec succès' }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}